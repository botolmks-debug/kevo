/**
 * POST /api/video/cerita/tts — fitur umum (semua user login).
 * Panggil ElevenLabs SEKALI per segmen narasi (sesuai jumlah slide).
 * Dipanggil setelah user setuju naskah & gambar di step storyboard.
 *
 * TIDAK POTONG TOKEN LAGI (revisi: biaya "Video Cerita Produk" digabung jadi
 * 6 token FLAT yang sudah dipotong di /api/video/cerita/storyboard — TTS di
 * sini otomatis "termasuk", tidak ada potongan token kedua).
 *
 * KARENA GRATIS, route ini WAJIB dikunci ketat supaya TIDAK bisa disalahgunakan
 * jadi "API TTS gratis lepas" yang dipanggil langsung tanpa pernah lewat
 * storyboard (celah rugi nyata: biaya ElevenLabs riil jalan tanpa ada token
 * yang menutupinya sama sekali). Kuncinya:
 * - Jumlah segmen dibatasi PERSIS sejumlah slide cerita (CERITA_SLIDE_COUNT
 *   dari storyboard route) — bukan sembarang array sepanjang apa pun.
 * - Tiap segmen dibatasi maks MAX_SEGMENT_CHARS karakter (skenario asli cuma
 *   6-14 kata ≈ puluhan karakter; ini kasih ruang aman tanpa buka pintu
 *   kirim naskah sepanjang artikel).
 * Ini tidak menjamin 100% tidak bisa dipanggil di luar alur storyboard (masih
 * perlu login), tapi membatasi kerugian maksimum PER PANGGILAN jadi kecil.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/monitoring/errorLog";
import { textToSpeechElevenLabs } from "@/lib/video/elevenlabs";
import { CERITA_SLIDE_COUNT } from "@/app/api/video/cerita/storyboard/route";

export const runtime = "nodejs";
export const maxDuration = 120;

// Batas aman per segmen — naskah asli 6-14 kata (±100 karakter). 220 dikasih
// ruang longgar tanpa membuka celah kirim naskah sepanjang artikel.
const MAX_SEGMENT_CHARS = 220;

type RequestBody = { segments?: string[]; voiceId?: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  let body: RequestBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as RequestBody;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const segments = Array.isArray(body.segments) ? body.segments.filter((s) => typeof s === "string" && s.trim()) : [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "Kirim minimal 1 segmen naskah." }, { status: 400 });
  }
  // Kunci #1: jumlah segmen wajib persis sejumlah slide cerita — bukan
  // sembarang panjang array.
  if (segments.length !== CERITA_SLIDE_COUNT) {
    return NextResponse.json(
      { error: `Jumlah segmen harus persis ${CERITA_SLIDE_COUNT} (sesuai jumlah slide cerita).` },
      { status: 400 },
    );
  }
  // Kunci #2: tiap segmen dibatasi panjangnya.
  const tooLong = segments.find((s) => s.length > MAX_SEGMENT_CHARS);
  if (tooLong) {
    return NextResponse.json(
      { error: `Naskah terlalu panjang (maks ${MAX_SEGMENT_CHARS} karakter/segmen).` },
      { status: 400 },
    );
  }
  const voiceId = typeof body.voiceId === "string" && body.voiceId.trim() ? body.voiceId.trim() : undefined;

  const authedUser = user;
  async function fail(error: string, status: number) {
    await logError({
      businessId: authedUser.id,
      route: "video-cerita-tts",
      provider: "elevenlabs",
      error: new Error(error),
      metadata: { status, segmentCount: segments.length },
    });
    return NextResponse.json({ error }, { status });
  }

  // Berurutan (bukan paralel) — ElevenLabs rate-limit ketat di paket kecil,
  // dan jumlah segmen selalu kecil (5) jadi tak terasa lambat.
  const audios: { audioBase64: string; mimeType: string }[] = [];
  for (const segment of segments) {
    const result = await textToSpeechElevenLabs(segment, voiceId);
    if (!result.ok) return fail(result.error, 502);
    audios.push({ audioBase64: result.audioBase64, mimeType: result.mimeType });
  }

  return NextResponse.json({ audios });
}
