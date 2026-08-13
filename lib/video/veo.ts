/**
 * Veo (video generation) via Gemini API — kunci yang sama dengan Gemini
 * teks/gambar (env GEMINI_API_KEY). PERHATIAN: butuh PAID TIER dengan
 * billing aktif di Google AI Studio; di free tier submit akan ditolak.
 *
 * Model default veo-3.1-fast (lebih murah, ±$0.15-0.40/detik). Ganti via env
 * VEO_MODEL, mis. "veo-3.1-generate-preview" untuk kualitas penuh (±$0.75/dtk).
 * Endpoint mengikuti dokumentasi Gemini API (predictLongRunning + poll
 * operation) — kalau Google mengubah nama model, cukup update env tanpa deploy.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum di-set di .env.local");
  return key;
}

export function veoModel(): string {
  return process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";
}

export type VeoSubmitInput = {
  prompt: string;
  negativePrompt?: string;
  /** Foto produk (image-to-video) — sangat disarankan supaya produk akurat. */
  imageBase64?: string;
  imageMimeType?: string;
  aspectRatio: "9:16" | "16:9";
  durationSeconds?: number; // 4 | 6 | 8 (default 8)
};

/** Submit job video. Mengembalikan nama operation untuk polling. */
export async function submitVeo(input: VeoSubmitInput): Promise<string> {
  const instance: Record<string, unknown> = { prompt: input.prompt };
  if (input.imageBase64) {
    instance.image = {
      bytesBase64Encoded: input.imageBase64,
      mimeType: input.imageMimeType || "image/jpeg",
    };
  }

  const parameters: Record<string, unknown> = {
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds ?? 8,
  };
  if (input.negativePrompt) parameters.negativePrompt = input.negativePrompt;

  const res = await fetch(`${BASE}/models/${veoModel()}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify({ instances: [instance], parameters }),
  });

  const body = (await res.json().catch(() => null)) as { name?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.name) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    // Pesan billing dibuat jelas karena ini kegagalan paling umum.
    if (/billing|quota|permission|not enabled/i.test(msg)) {
      throw new Error(
        `Veo ditolak Google: ${msg}. Kemungkinan besar akun Gemini API masih free tier — aktifkan billing/paid tier di Google AI Studio, atau cek env VEO_MODEL.`
      );
    }
    throw new Error(`Gagal submit Veo: ${msg}`);
  }
  return body.name;
}

export type VeoStatus =
  | { done: false }
  | { done: true; videoUri: string }
  | { done: true; error: string };

/** Poll status operation. */
export async function getVeoStatus(operationName: string): Promise<VeoStatus> {
  const res = await fetch(`${BASE}/${operationName}`, {
    headers: { "x-goog-api-key": apiKey() },
  });
  const body = (await res.json().catch(() => null)) as {
    done?: boolean;
    error?: { message?: string };
    response?: {
      generateVideoResponse?: {
        generatedSamples?: { video?: { uri?: string } }[];
        raiMediaFilteredCount?: number;
        raiMediaFilteredReasons?: string[];
      };
    };
  } | null;

  if (!res.ok || !body) return { done: true, error: `Gagal cek status (HTTP ${res.status})` };
  if (!body.done) return { done: false };
  if (body.error?.message) return { done: true, error: body.error.message };

  const gvr = body.response?.generateVideoResponse;
  const uri = gvr?.generatedSamples?.[0]?.video?.uri;
  if (!uri) {
    const reason = gvr?.raiMediaFilteredReasons?.[0];
    return {
      done: true,
      error: reason
        ? `Video ditolak filter keamanan Google: ${reason}. Ubah prompt (hindari wajah anak, merek terkenal, klaim medis).`
        : "Selesai tapi tidak ada video di respons — coba lagi.",
    };
  }
  return { done: true, videoUri: uri };
}

/** Unduh bytes mp4 dari uri hasil Veo (butuh API key). */
export async function downloadVeoVideo(videoUri: string): Promise<ArrayBuffer> {
  const sep = videoUri.includes("?") ? "&" : "?";
  const res = await fetch(`${videoUri}${sep}key=${apiKey()}`, {
    headers: { "x-goog-api-key": apiKey() },
  });
  if (!res.ok) throw new Error(`Gagal mengunduh video (HTTP ${res.status})`);
  return res.arrayBuffer();
}
