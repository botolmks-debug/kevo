/**
 * POST /api/video/veo/generate — ADMIN ONLY.
 * Kirim job video ke Veo (Gemini API): prompt hasil storyboard (kunci
 * realisme ditempel ulang di sini walau admin mengedit prompt) + foto produk
 * (image-to-video). Balikan: nama operation untuk polling.
 * BIAYA NYATA per klip (paid tier Google) — dipanggil hanya dari halaman admin.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, consumeToken } from "@/lib/supabase/tokens";
import { submitVeo } from "@/lib/video/veo";
import { REALISM_LOCK, NEGATIVE_LOCK } from "@/lib/video/storyboard";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    prompt?: string;
    negativePrompt?: string;
    productImageUrl?: string;
    aspectRatio?: "9:16" | "16:9";
    durationSeconds?: number;
  } | null;
  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt kosong — buat storyboard dulu." }, { status: 400 });
  }

  // Foto produk -> base64 (image-to-video) supaya produk di video akurat.
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  if (body.productImageUrl) {
    try {
      const imgRes = await fetch(body.productImageUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        imageBase64 = buf.toString("base64");
        imageMimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
      }
    } catch {
      // tanpa gambar tetap bisa (text-to-video), tapi produk bisa kurang akurat
    }
  }

  // Tempel ulang kunci realisme kalau admin menghapusnya saat mengedit prompt.
  const prompt = body.prompt.includes("Photorealistic")
    ? body.prompt.trim()
    : `${body.prompt.trim()} ${REALISM_LOCK}`;

  try {
    const operationName = await submitVeo({
      prompt,
      negativePrompt: body.negativePrompt?.trim() || NEGATIVE_LOCK,
      imageBase64,
      imageMimeType,
      aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
      durationSeconds:
        body.durationSeconds === 4 || body.durationSeconds === 6 ? body.durationSeconds : 8,
    });

    // Catat pemakaian (admin unlimited — token tidak berkurang, tapi hari
    // aktif & log Admin tetap tercatat).
    await consumeToken(supabase, user.id, user.email, "video-veo");

    return NextResponse.json({ operationName });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal submit ke Veo." },
      { status: 500 },
    );
  }
}
