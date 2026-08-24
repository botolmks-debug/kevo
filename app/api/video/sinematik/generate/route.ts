// POST /api/video/sinematik/generate
// body: { videoPrompt: string, keyframeDataUri?: string, productImageUrls: string[] }
// Submit job Veo 3.1 reference-to-video via fal queue. Return: { requestId }
import { NextResponse } from "next/server";
import { submitVeoRef } from "@/lib/video/sinematik";
import { getRouteUser, isSinematikAdmin } from "@/lib/video/sinematikServer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const body = await req.json();
    const videoPrompt = (body.videoPrompt || "").trim();
    if (!videoPrompt) return NextResponse.json({ error: "videoPrompt kosong" }, { status: 400 });

    // Veo maks 3 gambar referensi. Prioritas: panel keyframe (alur adegan) dulu,
    // lalu foto produk asli (kunci label). Dukung format lama (keyframeDataUri tunggal).
    const keyframeList: string[] = Array.isArray(body.keyframeDataUris)
      ? body.keyframeDataUris.filter(Boolean)
      : body.keyframeDataUri
        ? [body.keyframeDataUri]
        : [];

    const imageUrls: string[] = [];
    for (const u of keyframeList) {
      if (imageUrls.length >= 3) break;
      imageUrls.push(u);
    }
    for (const u of body.productImageUrls || []) {
      if (imageUrls.length >= 3) break;
      imageUrls.push(u);
    }
    if (imageUrls.length < 1)
      return NextResponse.json({ error: "Minimal 1 gambar referensi" }, { status: 400 });

    const prompt =
      videoPrompt +
      `\n\nThe reference images are the ordered storyboard panels of ONE continuous 8-second clip; ` +
      `flow smoothly through these scenes in order. Keep the product's shape, label and text EXACT across the whole clip.`;

    const requestId = await submitVeoRef({ videoPrompt: prompt, imageUrls });
    return NextResponse.json({ requestId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal submit video" }, { status: 500 });
  }
}
