import type { AspectRatio } from "@/lib/templates/types";
import { editOpenAIImage, generateOpenAIImage } from "@/lib/ai/openaiImage";

export type GeminiImageResult = { ok: true; dataUri: string } | { ok: false; error: string };

export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Naikkan timeout ke 120 detik — Gemini image (terutama edit gambar produk)
// biasanya butuh 45–90 detik. 30 detik terlalu pendek.
const REQUEST_TIMEOUT_MS = 120_000;

// Retry untuk 503 (server sibuk) DAN timeout (AbortError):
// jeda menaik supaya tidak spam server saat sedang overload.
const RETRY_DELAYS_MS = [5_000, 10_000, 15_000];
const MAX_TIMEOUT_RETRIES = 2; // timeout di-retry 2x sebelum menyerah

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(input: {
  parts: GeminiPart[];
  aspectRatio: AspectRatio;
  apiKey: string;
  model: string;
}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${GEMINI_API_BASE}/models/${input.model}:generateContent?key=${input.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: input.parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: input.aspectRatio },
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateFromParts(parts: GeminiPart[], aspectRatio: AspectRatio): Promise<GeminiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Fitur AI belum aktif: GEMINI_API_KEY belum diisi di server." };
  }

  // Selain imageConfig.aspectRatio, tegaskan rasio + DIMENSI PIKSEL di teks juga —
  // sebagian versi model lebih patuh lewat prompt, dan ini mencegah bar/padding.
  const dims =
    aspectRatio === "9:16" ? "1080x1920 piksel, potret TEGAK (tinggi > lebar)"
    : aspectRatio === "1:1" ? "1080x1080 piksel, PERSEGI"
    : "1080x1350 piksel, potret";
  const aspectHint: GeminiPart = {
    text: `PENTING: hasilkan gambar TEPAT rasio ${aspectRatio} (${dims}) yang PENUH mengisi seluruh bingkai. Rancang komposisi untuk orientasi ${aspectRatio} ini. Jangan tambahkan bar/pias hitam atau putih, jangan ada padding atau margin kosong, jangan ada bingkai. Gambar harus edge-to-edge sampai keempat tepi.`,
  };
  const finalParts: GeminiPart[] = [...parts, aspectHint];

  let timeoutCount = 0;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let response: Response;
    try {
      response = await callGemini({ parts: finalParts, aspectRatio, apiKey, model: GEMINI_IMAGE_MODEL });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Timeout — retry sampai MAX_TIMEOUT_RETRIES kali
        timeoutCount++;
        if (timeoutCount <= MAX_TIMEOUT_RETRIES && attempt < RETRY_DELAYS_MS.length) {
          console.warn(`Gemini image timeout (percobaan ${timeoutCount}), mencoba lagi...`);
          await wait(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        return {
          ok: false,
          error: "AI terlalu lama merespons. Coba lagi — biasanya berhasil di percobaan berikutnya.",
        };
      }
      return { ok: false, error: "Gagal menghubungi layanan AI. Periksa koneksi internet." };
    }

    if (response.status === 503) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return { ok: false, error: "Layanan AI sedang sibuk, coba lagi beberapa saat lagi." };
    }

    if (response.status === 404) {
      return {
        ok: false,
        error: `Model AI "${GEMINI_IMAGE_MODEL}" tidak ditemukan/tidak didukung lagi. Set env GEMINI_IMAGE_MODEL ke model yang masih aktif.`,
      };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { error?: { message?: string } } | null)?.error?.message ??
        `Gagal menyusun gambar (status ${response.status}).`;
      return { ok: false, error: message };
    }

    const data = await response.json().catch(() => null);
    const responseParts = (
      data as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] } | null
    )?.candidates?.[0]?.content?.parts;
    const imagePart = responseParts?.find((part) => part.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      return { ok: false, error: "AI tidak mengembalikan gambar. Coba lagi." };
    }

    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    return { ok: true, dataUri: `data:${mimeType};base64,${imagePart.inlineData.data}` };
  }

  return { ok: false, error: "Layanan AI sedang sibuk, coba lagi beberapa saat lagi." };
}

/**
 * Edit gambar via Gemini image model — dipakai untuk konten Produk
 * (susun ulang latar dari foto produk asli).
 */
export async function editImage(input: {
  imageBase64: string;
  mimeType: string;
  aspectRatio: AspectRatio;
  prompt: string;
}): Promise<GeminiImageResult> {
  const result = await generateFromParts(
    [{ inlineData: { mimeType: input.mimeType, data: input.imageBase64 } }, { text: input.prompt }],
    input.aspectRatio,
  );
  if (result.ok) return result;

  // Fallback: Gemini gagal total (sudah retry) -> coba OpenAI kalau sudah
  // di-setup. Kalau OPENAI_API_KEY belum diisi, ini no-op (kembalikan error
  // Gemini apa adanya) — jadi aman dipasang sebelum user setup OpenAI.
  if (!process.env.OPENAI_API_KEY) return result;
  console.warn("Gemini gagal (" + result.error + "), mencoba fallback OpenAI...");
  return editOpenAIImage(input);
}

/**
 * Generate gambar dari nol — dipakai untuk konten General & Interaksi.
 */
export async function generateImage(input: {
  prompt: string;
  aspectRatio: AspectRatio;
}): Promise<GeminiImageResult> {
  const result = await generateFromParts([{ text: input.prompt }], input.aspectRatio);
  if (result.ok) return result;

  if (!process.env.OPENAI_API_KEY) return result;
  console.warn("Gemini gagal (" + result.error + "), mencoba fallback OpenAI...");
  return generateOpenAIImage(input);
}
/**
 * GABUNG PRODUK — kirim beberapa foto produk (2–5) sekaligus, AI diminta
 * mendeteksi produk utama tiap foto lalu menyusunnya jadi SATU frame.
 * Tidak ada fallback OpenAI di sini karena alur multi-image berbeda.
 */
export async function composeProducts(input: {
  images: { imageBase64: string; mimeType: string }[];
  aspectRatio: AspectRatio;
  prompt: string;
}): Promise<GeminiImageResult> {
  const imageParts: GeminiPart[] = input.images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.imageBase64 },
  }));
  return generateFromParts([...imageParts, { text: input.prompt }], input.aspectRatio);
}
