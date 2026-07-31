/**
 * POST /api/remove-background
 * 1. Kirim foto produk ke Gemini → dapat PNG produk (background masih putih/solid)
 * 2. Apply removeSolidBackground (flood-fill sharp) → PNG transparan
 * 3. Return data URI PNG transparan
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeSolidBackground } from "@/lib/images/backgroundRemoval";
import { consumeToken } from "@/lib/supabase/tokens";

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

  const token = await consumeToken(supabase, user.id, user.email);
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
    return NextResponse.json({ error: "Gagal mengambil gambar." }, { status: 502 });
  }

  // Langkah 1: Gemini pisahkan produk dari background
  const prompt = `Remove the background from this photo completely. 
Keep the main product/object EXACTLY as it is.
Replace the background with solid WHITE (#FFFFFF).
The product should be cleanly separated from everything else.
Do not add shadows, reflections, or effects.
Return the product on a clean white background.`;

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
    if (e instanceof Error && e.name === "AbortError") {
      return NextResponse.json({ error: "AI terlalu lama merespons. Coba lagi." }, { status: 504 });
    }
    return NextResponse.json({ error: "Gagal menghubungi AI." }, { status: 502 });
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = (errBody as { error?: { message?: string } } | null)?.error?.message ?? `Status ${response.status}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const data = await response.json().catch(() => null);
  const parts = (data as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[]
  } | null)?.candidates?.[0]?.content?.parts;
  const imgPart = parts?.find(p => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    return NextResponse.json({ error: "AI tidak mengembalikan gambar." }, { status: 502 });
  }

  // Langkah 2: Hapus background putih (flood-fill) → PNG transparan
  let transparentBuffer: Buffer;
  try {
    const geminiBuffer = Buffer.from(imgPart.inlineData.data, "base64");
    transparentBuffer = await removeSolidBackground(geminiBuffer);
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
