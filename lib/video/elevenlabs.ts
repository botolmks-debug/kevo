/**
 * ElevenLabs Text-to-Speech — dipakai untuk narasi "Video Cerita Produk".
 * API key butuh scope "Text to Speech: Access" (opsional "Voices: Read" kalau
 * mau daftar suara). Env: ELEVENLABS_API_KEY (wajib), ELEVENLABS_VOICE_ID
 * (opsional — default ke suara multibahasa netral kalau kosong).
 */

const API_BASE = "https://api.elevenlabs.io/v1";

// Suara default: "Adam" (multilingual, terbukti bagus untuk Bahasa Indonesia
// lewat model eleven_multilingual_v2). Bisa dioverride via ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export type TtsResult =
  | { ok: true; audioBase64: string; mimeType: string }
  | { ok: false; error: string };

/**
 * Ubah teks naskah jadi audio MP3 (base64). Satu segmen naskah = satu
 * panggilan — dipakai per-slide di Video Cerita Produk supaya durasi tiap
 * segmen bisa dipakai buat nge-time fade-in slide-nya.
 */
export async function textToSpeechElevenLabs(
  text: string,
  voiceId?: string,
): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, error: "ELEVENLABS_API_KEY belum diisi di environment." };
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  try {
    const res = await fetch(`${API_BASE}/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        // multilingual_v2 = kualitas terbaik ElevenLabs untuk Bahasa Indonesia.
        model_id: "eleven_multilingual_v2",
        // speed 0.9 = sedikit lebih lambat dari default 1.0 (revisi: narasi
        // kesannya terburu-buru). Range API 0.7-1.2; di bawah ~0.7 kualitas
        // audio mulai menurun, jadi 0.9 dipilih sebagai penurunan yang aman.
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.9 },
      }),
    });

    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { detail?: { message?: string } | string };
        detail = typeof j.detail === "string" ? j.detail : j.detail?.message ?? "";
      } catch {
        // respons bukan JSON — abaikan, pakai status code saja
      }
      if (res.status === 401) return { ok: false, error: "API key ElevenLabs tidak valid atau tidak punya akses Text to Speech." };
      if (res.status === 429) return { ok: false, error: "Kuota/rate limit ElevenLabs habis. Coba lagi nanti atau upgrade paket." };
      return { ok: false, error: `ElevenLabs gagal (${res.status}): ${detail || "coba lagi."}` };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, audioBase64: buf.toString("base64"), mimeType: "audio/mpeg" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `Gagal menghubungi ElevenLabs: ${e.message}` : "Gagal menghubungi ElevenLabs." };
  }
}

export type ElevenVoice = { voiceId: string; name: string; previewUrl?: string };

/** Daftar suara di akun ElevenLabs — butuh scope "Voices: Read". Opsional. */
export async function listElevenVoices(): Promise<{ ok: true; voices: ElevenVoice[] } | { ok: false; error: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, error: "ELEVENLABS_API_KEY belum diisi." };
  try {
    const res = await fetch(`${API_BASE}/voices`, { headers: { "xi-api-key": apiKey } });
    if (!res.ok) return { ok: false, error: `Gagal ambil daftar suara (${res.status}).` };
    const data = (await res.json()) as { voices?: { voice_id: string; name: string; preview_url?: string }[] };
    const voices = (data.voices ?? []).map((v) => ({ voiceId: v.voice_id, name: v.name, previewUrl: v.preview_url }));
    return { ok: true, voices };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal ambil daftar suara." };
  }
}
