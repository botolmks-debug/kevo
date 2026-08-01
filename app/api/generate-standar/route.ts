/**
 * POST /api/generate-standar
 * Untuk model "Konten Standar" bila gambar ber-usage "olah_ai".
 * Ambil gambar dari URL -> edit via Gemini pakai prompt dari judul+deskripsi
 * -> kembalikan data URI PNG.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editImage } from "@/lib/ai/geminiImage";
import { buildStandarImagePrompt } from "@/lib/ai/standarPrompt";
import { consumeToken } from "@/lib/supabase/tokens";
import type { AspectRatio } from "@/lib/templates/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_RATIOS = new Set<AspectRatio>(["4:5", "1:1", "9:16"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY belum diisi." }, { status: 503 });
  }

  const token = await consumeToken(supabase, user.id, user.email, "Konten Standar");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  let body: { imageUrl?: string; judul?: string; descriptions?: string[]; ratio?: AspectRatio; sizeHint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  const judul = (body.judul ?? "").trim();
  const descriptions = Array.isArray(body.descriptions) ? body.descriptions.map((d) => String(d)) : [];
  const ratio: AspectRatio = VALID_RATIOS.has(body.ratio as AspectRatio) ? (body.ratio as AspectRatio) : "4:5";

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl wajib diisi." }, { status: 400 });
  }
  if (!judul && descriptions.every((d) => !d.trim())) {
    return NextResponse.json({ error: "Isi judul atau deskripsi dulu." }, { status: 400 });
  }

  // Ambil gambar dari URL
  let imageBase64: string;
  let mimeType: string;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`status ${res.status}`);
    mimeType = res.headers.get("content-type") ?? "image/jpeg";
    imageBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json({ error: "Gagal mengambil gambar." }, { status: 502 });
  }

  let result;
  try {
    result = await editImage({
      imageBase64,
      mimeType,
      aspectRatio: ratio,
      prompt: buildStandarImagePrompt(judul, descriptions, body.sizeHint),
    });
  } catch (e) {
    console.error(`generate-standar editImage threw: ${e instanceof Error ? e.message : e}`);
    return NextResponse.json({ error: "AI gagal memproses gambar. Coba lagi." }, { status: 502 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ dataUri: result.dataUri });
}
