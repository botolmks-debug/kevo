/**
 * POST /api/video/cerita/tts — fitur umum (semua user login).
 * Panggil ElevenLabs SEKALI per segmen narasi (sesuai jumlah slide).
 * Dipanggil setelah user setuju naskah & gambar di step storyboard —
 * ini yang beneran keluar biaya nyata ke ElevenLabs, jadi sengaja dipisah
 * step-nya (sama seperti pola review-dulu di fitur video lain).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeTokens, refundTokens } from "@/lib/supabase/tokens";
import { logError } from "@/lib/monitoring/errorLog";
import { textToSpeechElevenLabs } from "@/lib/video/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Token dipotong per PANGGILAN TTS (5 segmen = 5 token) — biaya ElevenLabs nyata. */
export const CERITA_TTS_TOKEN_COST_PER_SEGMENT = 1;

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
  const voiceId = typeof body.voiceId === "string" && body.voiceId.trim() ? body.voiceId.trim() : undefined;

  const totalCost = CERITA_TTS_TOKEN_COST_PER_SEGMENT * segments.length;
  const token = await consumeTokens(supabase, user.id, totalCost, user.email, "Video Cerita Produk - TTS ElevenLabs");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  const authedUser = user;
  async function fail(error: string, status: number) {
    await refundTokens(supabase, authedUser.id, totalCost, authedUser.email);
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
  // dan jumlah segmen selalu kecil (4) jadi tak terasa lambat.
  const audios: { audioBase64: string; mimeType: string }[] = [];
  for (const segment of segments) {
    const result = await textToSpeechElevenLabs(segment, voiceId);
    if (!result.ok) return fail(result.error, 502);
    audios.push({ audioBase64: result.audioBase64, mimeType: result.mimeType });
  }

  return NextResponse.json({ audios, tokensRemaining: token.remaining });
}
