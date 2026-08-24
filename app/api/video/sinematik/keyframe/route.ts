// POST /api/video/sinematik/keyframe
// body: { imagePrompt: string, productImageUrls: string[], refImageDataUri?: string }
// Return: { dataUri } — 1 gambar keyframe 9:16 untuk SATU panel adegan.
// Pakai OpenAI gpt-image-1 (Andri: hasil Gemini kurang bagus). Kalau ada
// refImageDataUri (keyframe panel PERTAMA), dipakai sebagai acuan konsistensi
// karakter/suasana; foto produk asli tetap jadi dasar supaya label persis.
import { NextResponse } from "next/server";
import { getRouteUser, isSinematikAdmin, fetchAsBase64 } from "@/lib/video/sinematikServer";
import { editOpenAIImage, generateOpenAIImage } from "@/lib/ai/openaiImage";

export const maxDuration = 120;

function dataUriToParts(dataUri: string): { base64: string; mimeType: string } | null {
  const m = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

export async function POST(req: Request) {
  try {
    const { user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const body = await req.json();
    const imagePrompt = (body.imagePrompt || "").trim();
    const urls: string[] = (body.productImageUrls || []).slice(0, 3);
    const refImageDataUri: string | undefined = body.refImageDataUri;
    if (!imagePrompt) return NextResponse.json({ error: "imagePrompt kosong" }, { status: 400 });

    const scenePrompt = [
      "Photorealistic cinematic product keyframe, vertical 9:16, single still frame.",
      refImageDataUri
        ? "Keep the SAME product, SAME styling, SAME lighting and mood as the reference frame for visual consistency across the video."
        : "",
      "No people, no hands, no on-screen text, no captions, no watermark, no borders. Product label must stay EXACTLY as in the source photo.",
      `SCENE: ${imagePrompt}`,
    ]
      .filter(Boolean)
      .join(" ");

    // Dasar gambar: foto produk (utamakan label persis). Kalau tak ada foto,
    // pakai panel acuan; kalau dua-duanya tak ada, generate dari nol.
    let result;
    if (urls.length > 0) {
      const base = await fetchAsBase64(urls[0]);
      result = await editOpenAIImage({
        imageBase64: base.base64,
        mimeType: base.mimeType,
        aspectRatio: "9:16",
        prompt: scenePrompt,
      });
    } else if (refImageDataUri) {
      const p = dataUriToParts(refImageDataUri);
      if (!p) return NextResponse.json({ error: "refImageDataUri tidak valid" }, { status: 400 });
      result = await editOpenAIImage({
        imageBase64: p.base64,
        mimeType: p.mimeType,
        aspectRatio: "9:16",
        prompt: scenePrompt,
      });
    } else {
      result = await generateOpenAIImage({ prompt: scenePrompt, aspectRatio: "9:16" });
    }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ dataUri: result.dataUri });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal membuat keyframe" }, { status: 500 });
  }
}
