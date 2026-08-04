/**
 * POST /api/remove-background
 * 1. Kirim foto produk ke Gemini → dapat PNG produk (background masih putih/solid)
 * 2. Apply removeSolidBackground (flood-fill sharp) → PNG transparan
 * 3. Return data URI PNG transparan
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeChromaBackground } from "@/lib/images/backgroundRemoval";
import { consumeToken, refundToken } from "@/lib/supabase/tokens";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY belum diisi." }, { status: 503 });

  const token = await consumeToken(supabase, user.id, user.email, "Hapus Background");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  let body: { imageUrl?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Body tidak valid." }, { status: 400 }); }

  if (!body.imageUrl) {
    return NextResponse.json({ error: "imageUrl wajib diisi." }, { status: 400 });
  }

  // Ambil gambar dari URL
  let imageBase64: string;
  let mimeType: string;
  try {
    const res = await fetch(body.imageUrl);
    if (!res.ok) throw new Error(`status ${res.status}`);
    mimeType = res.headers.get("content-type") ?? "image/jpeg";
    imageBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    await refundToken(supabase, user.id, user.email);
    return NextResponse.json({ error: "Gagal mengambil gambar." }, { status: 502 });
  }

  // Langkah 1: Gemini ISOLASI produk utama — apa pun di belakang/sekitar
  // (latar rame, tangan, clutter) diganti warna solid mencolok (magenta) yang
  // mudah di-key-out. Fokus ke PRODUK DOMINAN, bukan sekadar hapus putih.
  const prompt = `You are an expert product-cutout tool. Isolate the MAIN PRODUCT/SUBJECT in this photo from EVERYTHING else.

CRITICAL - PRESERVE FRAMING EXACTLY (most important rule):
Output MUST have the EXACT SAME dimensions, aspect ratio, zoom level, and product position as the INPUT image. Do NOT crop, zoom in, zoom out, rotate, re-center, resize, or reframe. The product must stay in the IDENTICAL position and at the IDENTICAL size within the frame as in the original photo — pixel-for-pixel the same placement. ONLY the background pixels change to magenta; the product does not move or change size at all.

KEEP EXACTLY (do not alter): the single main product/subject (usually centered). Preserve its shape, proportions, colors, transparency, and any text/label PHYSICALLY PRINTED on it.

REPLACE WITH SOLID MAGENTA (#FF00FF): the ENTIRE rest of the image — background, floor, walls, tables, the hand/fingers holding the product, other objects, people, clutter, and original shadows. No matter how busy or colorful the background is, ALL of it becomes flat pure magenta #FF00FF.

RULES:
- The product must be the ONLY non-magenta thing in the output.
- Keep the product's position and size identical to the input (see CRITICAL rule above).
- Fill the whole frame with magenta around the product, edge to edge.
- Pure flat magenta #FF00FF only — no gradient, texture, shadow, or tint.
- Do NOT add any new text, logos, reflections, or effects.
- If the product is transparent/see-through (glass, clear plastic), let the magenta show through it (so it stays see-through) but keep the product's own outline/rim clearly visible.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 110_000);

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
          },
        }),
        signal: controller.signal,
      },
    );
  } catch (e) {
    clearTimeout(timeoutId);
    await refundToken(supabase, user.id, user.email);
    if (e instanceof Error && e.name === "AbortError") {
      return NextResponse.json({ error: "AI terlalu lama merespons. Coba lagi." }, { status: 504 });
    }
    return NextResponse.json({ error: "Gagal menghubungi AI." }, { status: 502 });
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = (errBody as { error?: { message?: string } } | null)?.error?.message ?? `Status ${response.status}`;
    await refundToken(supabase, user.id, user.email);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const data = await response.json().catch(() => null);
  const parts = (data as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[]
  } | null)?.candidates?.[0]?.content?.parts;
  const imgPart = parts?.find(p => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    await refundToken(supabase, user.id, user.email);
    return NextResponse.json({ error: "AI tidak mengembalikan gambar." }, { status: 502 });
  }

  // Langkah 2: Hapus background putih (flood-fill) → PNG transparan
  let transparentBuffer: Buffer;
  try {
    const geminiBuffer = Buffer.from(imgPart.inlineData.data, "base64");
    transparentBuffer = await removeChromaBackground(geminiBuffer);
  } catch {
    // Kalau gagal, kembalikan gambar Gemini apa adanya
    const fallbackUri = `data:${imgPart.inlineData.mimeType ?? "image/png"};base64,${imgPart.inlineData.data}`;
    return NextResponse.json({ dataUri: fallbackUri });
  }

  const base64Result = transparentBuffer.toString("base64");
  return NextResponse.json({
    dataUri: `data:image/png;base64,${base64Result}`,
  });
}
