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

    // Urutan referensi: keyframe (adegan pembuka yang sudah di-approve) dulu,
    // lalu foto produk asli (kunci bentuk & label). Maks 3 gambar (batas Veo).
    const imageUrls: string[] = [];
    if (body.keyframeDataUri) imageUrls.push(body.keyframeDataUri);
    for (const u of body.productImageUrls || []) {
      if (imageUrls.length >= 3) break;
      imageUrls.push(u);
    }
    if (imageUrls.length < 1)
      return NextResponse.json({ error: "Minimal 1 gambar referensi" }, { status: 400 });

    const prompt =
      videoPrompt +
      "\n\nThe FIRST reference image defines the opening composition and scene. " +
      "The OTHER reference images are the real product - keep its shape, label and text EXACT.";

    const requestId = await submitVeoRef({ videoPrompt: prompt, imageUrls });
    return NextResponse.json({ requestId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal submit video" }, { status: 500 });
  }
}
