/**
 * POST /api/recolor-background
 * Kirim foto produk + warna hex → Gemini ubah latar jadi warna itu,
 * produk tetap utuh. Return: { dataUri: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY belum diisi." }, { status: 503 });

  let body: { imageUrl?: string; imageBase64?: string; mimeType?: string; bgColor?: string; aspectRatio?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Body tidak valid." }, { status: 400 }); }

  const { imageUrl, imageBase64: directBase64, mimeType: directMime, bgColor = "#F97316", aspectRatio = "4:5" } = body;

  if (!imageUrl && !directBase64) {
    return NextResponse.json({ error: "imageUrl atau imageBase64 wajib diisi." }, { status: 400 });
  }

  let imageBase64: string;
  let mimeType: string;

  if (directBase64) {
    imageBase64 = directBase64;
    mimeType = directMime ?? "image/jpeg";
  } else {
    try {
      const res = await fetch(imageUrl!);
      if (!res.ok) throw new Error(`status ${res.status}`);
      mimeType = res.headers.get("content-type") ?? "image/jpeg";
      imageBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    } catch {
      return NextResponse.json({ error: "Gagal mengambil gambar." }, { status: 502 });
    }
  }

  const rgbColor = hexToRgb(bgColor);
  const prompt = `You are a professional product photographer editor.

Keep the main product/subject in this photo EXACTLY as it is — do not change its shape, colors, labels, or any detail. The product stays perfectly intact and sharp.

Replace the ENTIRE background with a SOLID COLOR: ${rgbColor} (${bgColor}). The background should be a clean, smooth solid color — no gradients, no textures, no patterns, just pure flat ${rgbColor}.

Make the product look naturally placed on this solid background:
- Add a subtle drop shadow below the product matching the background tone (slightly darker version of ${rgbColor})
- Blend the product edges naturally into the solid background (no harsh cut-out lines, no white fringe)
- The lighting on the product should feel consistent with a product photography studio shot against this color background

Result: clean professional product photo on solid ${rgbColor} background, ready for social media.

Do NOT add any text, watermarks, logos, or decorations.`;

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
            imageConfig: { aspectRatio },
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
  const parts = (data as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts;
  const imgPart = parts?.find(p => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    return NextResponse.json({ error: "AI tidak mengembalikan gambar." }, { status: 502 });
  }

  const outMime = imgPart.inlineData.mimeType ?? "image/png";
  return NextResponse.json({
    dataUri: `data:${outMime};base64,${imgPart.inlineData.data}`,
  });
}