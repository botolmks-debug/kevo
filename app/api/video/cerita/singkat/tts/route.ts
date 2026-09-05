/**
 * POST /api/video/cerita/singkat/tts — fitur umum (semua user login).
 * Ubah 1 naskah (hasil /api/video/cerita/singkat/naskah) jadi audio MP3
 * lewat ElevenLabs. TIDAK potong token lagi — biaya sudah termasuk paket
 * flat di step /naskah (lihat catatan di sana), sama pola-nya dengan
 * /api/video/cerita/tts (Cerita Produk).
 *
 * KARENA GRATIS di sini, dikunci ketat sama seperti /api/video/cerita/tts:
 * 1 naskah saja per panggilan, dibatasi panjang karakter, supaya tidak jadi
 * "API TTS gratis lepas" yang bisa dipanggil langsung tanpa lewat /naskah.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { logError } from "@/lib/monitoring/errorLog";
import { textToSpeechElevenLabs } from "@/lib/video/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 60;

// Naskah target 35-42 kata (±230-280 karakter Bahasa Indonesia). 320 dikasih
// ruang longgar tanpa membuka celah kirim naskah sepanjang artikel.
const MAX_SCRIPT_CHARS = 320;

type RequestBody = { text?: string; voiceId?: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: "Fitur Video Cerita khusus admin (sementara)." }, { status: 403 });

  let body: RequestBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as RequestBody;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Naskah kosong." }, { status: 400 });
  if (text.length > MAX_SCRIPT_CHARS) {
    return NextResponse.json({ error: `Naskah terlalu panjang (maks ${MAX_SCRIPT_CHARS} karakter).` }, { status: 400 });
  }
  const voiceId = typeof body.voiceId === "string" && body.voiceId.trim() ? body.voiceId.trim() : undefined;

  const result = await textToSpeechElevenLabs(text, voiceId, "eleven_v3");
  if (!result.ok) {
    await logError({
      businessId: user.id,
      route: "video-cerita-singkat-tts",
      provider: "elevenlabs",
      error: new Error(result.error),
      metadata: { textLength: text.length },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ audioBase64: result.audioBase64, mimeType: result.mimeType });
}
