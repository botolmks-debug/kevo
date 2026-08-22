// POST /api/video/sinematik/keyframe
// body: { imagePrompt: string, productImageUrls: string[] }
// Return: { dataUri } — gambar keyframe 9:16 utk di-approve user (murah utk regenerate).
import { NextResponse } from "next/server";
import { generateKeyframe } from "@/lib/video/sinematik";
import { getRouteUser, isSinematikAdmin, fetchAsBase64 } from "@/lib/video/sinematikServer";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const body = await req.json();
    const imagePrompt = (body.imagePrompt || "").trim();
    const urls: string[] = (body.productImageUrls || []).slice(0, 3);
    if (!imagePrompt) return NextResponse.json({ error: "imagePrompt kosong" }, { status: 400 });
    if (urls.length < 1)
      return NextResponse.json({ error: "productImageUrls kosong" }, { status: 400 });

    const productImages = await Promise.all(urls.map((u) => fetchAsBase64(u)));
    const dataUri = await generateKeyframe({ imagePrompt, productImages });

    return NextResponse.json({ dataUri });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal membuat keyframe" }, { status: 500 });
  }
}
