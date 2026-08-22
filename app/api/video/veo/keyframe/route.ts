/**
 * POST /api/video/veo/keyframe — ADMIN ONLY.
 * Buat 1 gambar storyboard (keyframe) dari OpenAI gpt-image-1.
 * - Kalau ada foto produk: pakai editOpenAIImage (foto asli jadi dasar → label
 *   produk terjaga, pagar PRESERVE_PRODUCT_GUARD sudah di dalam fungsi itu).
 * - Kalau tidak ada foto: generateOpenAIImage (dari nol).
 * Dipakai supaya admin bisa cek dulu SEBELUM men-generate video (yang mahal).
 * body: { sceneDescription: string, productImageUrl?: string, aspectRatio?: "9:16" | "16:9" }
 * return: { dataUri }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { editOpenAIImage, generateOpenAIImage } from "@/lib/ai/openaiImage";
import type { AspectRatio } from "@/lib/templates/types";

export const runtime = "nodejs";
export const maxDuration = 120;

async function fetchAsBase64(url: string): Promise<{ mimeType: string; base64: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal ambil foto produk (${res.status}).`);
  const mimeType = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, base64: buf.toString("base64") };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    sceneDescription?: string;
    productImageUrl?: string;
    aspectRatio?: "9:16" | "16:9";
  } | null;

  const scene = body?.sceneDescription?.trim();
  if (!scene) {
    return NextResponse.json({ error: "Deskripsi adegan kosong." }, { status: 400 });
  }

  // OpenAI images hanya potret/persegi/lanskap tetap; 16:9 tak ada padanan pas,
  // jadi keyframe dipatok potret (aman utk video 9:16 & cukup utk cek komposisi).
  const aspect: AspectRatio = "9:16";

  const scenePrompt = [
    "Photorealistic still keyframe for a short vertical social-media video (single frame, not a collage).",
    "Candid, natural soft lighting, tidy pleasant everyday setting. No on-screen text, no app UI, no captions, no watermark, no borders.",
    `SCENE: ${scene}`,
  ].join(" ");

  try {
    let result;
    if (body?.productImageUrl) {
      const img = await fetchAsBase64(body.productImageUrl);
      result = await editOpenAIImage({
        imageBase64: img.base64,
        mimeType: img.mimeType,
        aspectRatio: aspect,
        prompt: scenePrompt,
      });
    } else {
      result = await generateOpenAIImage({ prompt: scenePrompt, aspectRatio: aspect });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ dataUri: result.dataUri });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membuat keyframe." },
      { status: 500 },
    );
  }
}
