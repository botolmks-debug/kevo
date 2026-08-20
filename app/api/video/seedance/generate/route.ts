/**
 * POST /api/video/seedance/generate — ADMIN ONLY.
 * Kirim job video ke Seedance Fast (fal.ai): prompt hasil storyboard (kunci
 * realisme ditempel ulang seperti di jalur Veo) + URL foto produk
 * (image-to-video). Balikan: requestId untuk polling.
 * Jauh lebih murah dari Veo (±$0.2-0.3 per klip 8 dtk, 720p) — tapi tetap
 * biaya nyata di saldo fal.ai, jadi tetap dipanggil hanya dari halaman admin.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, consumeToken } from "@/lib/supabase/tokens";
import { submitSeedance } from "@/lib/video/seedance";
import { REALISM_LOCK } from "@/lib/video/storyboard";

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
    productImageUrl?: string;
    aspectRatio?: "9:16" | "16:9";
    durationSeconds?: number;
  } | null;
  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt kosong — buat storyboard dulu." }, { status: 400 });
  }
  // Model image-to-video: foto produk WAJIB (beda dari Veo yang bisa text-only).
  if (!body.productImageUrl?.trim()) {
    return NextResponse.json(
      { error: "Seedance butuh foto produk — pilih gambar dari galeri dulu." },
      { status: 400 },
    );
  }

  // Tempel ulang kunci realisme kalau admin menghapusnya saat mengedit prompt.
  // (Seedance tidak punya field negativePrompt terpisah — kunci positif saja.)
  const prompt = body.prompt.includes("Photorealistic")
    ? body.prompt.trim()
    : `${body.prompt.trim()} ${REALISM_LOCK}`;

  try {
    const requestId = await submitSeedance({
      prompt,
      imageUrl: body.productImageUrl.trim(),
      aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
      durationSeconds:
        body.durationSeconds === 5 || body.durationSeconds === 10 ? body.durationSeconds : 8,
    });

    // Catat pemakaian (admin unlimited — token tidak berkurang, tapi hari
    // aktif & log Admin tetap tercatat). Action beda dari Veo supaya kelihatan
    // di log provider mana yang dipakai.
    await consumeToken(supabase, user.id, user.email, "video-seedance");

    return NextResponse.json({ requestId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal submit ke Seedance." },
      { status: 500 },
    );
  }
}
