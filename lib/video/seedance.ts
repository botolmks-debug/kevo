/**
 * Seedance (ByteDance) via fal.ai queue — provider video kedua di samping Veo.
 * =====================================================================
 * Model default: bytedance/seedance-2.0/fast/image-to-video (720p, audio
 * native tersinkron, ±$0.02-0.03/detik — jauh lebih murah dari Veo).
 * Ganti via env SEEDANCE_MODEL tanpa deploy ulang logika.
 *
 * Pola fal.ai queue (async, cocok dgn batas waktu fungsi Vercel):
 *   1. POST https://queue.fal.run/{model}            -> { request_id }
 *   2. GET  https://queue.fal.run/{app}/requests/{id}/status
 *   3. GET  https://queue.fal.run/{app}/requests/{id} -> { video: { url } }
 * Catatan: URL status/result memakai APP ID = 2 segmen pertama model
 * (mis. "bytedance/seedance-2.0"), BUKAN path model lengkap — ini aturan
 * fal.ai, bukan pilihan kita.
 *
 * Env: FAL_API_KEY (atau FAL_KEY). Ambil di dashboard fal.ai -> Keys.
 * =====================================================================
 */

const QUEUE_BASE = "https://queue.fal.run";

function falKey(): string {
  const key = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!key) throw new Error("FAL_API_KEY belum di-set di .env.local (ambil di dashboard fal.ai)");
  return key;
}

export function seedanceModel(): string {
  return process.env.SEEDANCE_MODEL || "bytedance/seedance-2.0/fast/image-to-video";
}

/** APP ID untuk URL status/result = 2 segmen pertama dari model ID. */
function appId(): string {
  return seedanceModel().split("/").slice(0, 2).join("/");
}

export type SeedanceSubmitInput = {
  prompt: string;
  /** URL publik foto produk (image-to-video). Wajib untuk model image-to-video. */
  imageUrl: string;
  aspectRatio: "9:16" | "16:9";
  durationSeconds?: number; // 5 | 8 | 10 (default 8)
};

/** Submit job video. Mengembalikan request_id untuk polling. */
export async function submitSeedance(input: SeedanceSubmitInput): Promise<string> {
  const res = await fetch(`${QUEUE_BASE}/${seedanceModel()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey()}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      image_url: input.imageUrl,
      resolution: "720p",
      duration: String(
        input.durationSeconds === 5 || input.durationSeconds === 10 ? input.durationSeconds : 8,
      ),
      aspect_ratio: input.aspectRatio,
      generate_audio: true,
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { request_id?: string; detail?: unknown; error?: unknown }
    | null;
  if (!res.ok || !body?.request_id) {
    const msg =
      typeof body?.detail === "string"
        ? body.detail
        : body?.detail || body?.error
          ? JSON.stringify(body.detail ?? body.error).slice(0, 200)
          : `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Seedance ditolak fal.ai: ${msg}. Cek FAL_API_KEY di .env.local / Vercel env.`);
    }
    if (res.status === 402 || /balance|credit|payment/i.test(String(msg))) {
      throw new Error(`Saldo fal.ai habis atau billing belum aktif: ${msg}. Top-up di dashboard fal.ai.`);
    }
    throw new Error(`Gagal submit Seedance: ${msg}`);
  }
  return body.request_id;
}

export type SeedanceStatus =
  | { done: false }
  | { done: true; videoUrl: string }
  | { done: true; error: string };

/** Poll status request. Kalau COMPLETED, langsung ambil URL video dari result. */
export async function getSeedanceStatus(requestId: string): Promise<SeedanceStatus> {
  const headers = { Authorization: `Key ${falKey()}` };

  const res = await fetch(`${QUEUE_BASE}/${appId()}/requests/${requestId}/status`, { headers });
  const body = (await res.json().catch(() => null)) as { status?: string; error?: unknown } | null;
  if (!res.ok || !body?.status) {
    return { done: true, error: `Gagal cek status Seedance (HTTP ${res.status})` };
  }

  if (body.status === "IN_QUEUE" || body.status === "IN_PROGRESS") return { done: false };
  if (body.status !== "COMPLETED") {
    return { done: true, error: `Seedance gagal (status: ${body.status}). Coba lagi atau ubah prompt.` };
  }

  // COMPLETED -> ambil result untuk URL video.
  const resultRes = await fetch(`${QUEUE_BASE}/${appId()}/requests/${requestId}`, { headers });
  const result = (await resultRes.json().catch(() => null)) as
    | { video?: { url?: string }; detail?: unknown }
    | null;
  const url = result?.video?.url;
  if (!resultRes.ok || !url) {
    return { done: true, error: "Selesai tapi tidak ada video di respons fal.ai — coba lagi." };
  }
  return { done: true, videoUrl: url };
}

/** Unduh bytes mp4 dari URL hasil fal (URL publik CDN fal, tanpa auth). */
export async function downloadSeedanceVideo(videoUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Gagal mengunduh video Seedance (HTTP ${res.status})`);
  return res.arrayBuffer();
}
