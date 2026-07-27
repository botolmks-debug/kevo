import type { AspectRatio } from "@/lib/templates/types";

export type GeminiImageResult = { ok: true; dataUri: string } | { ok: false; error: string };

export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Generate/compose gambar biasanya lebih lambat dari generate teks.
const REQUEST_TIMEOUT_MS = 30_000;
// Retry hanya untuk 503 "high demand": maks 3x percobaan ulang dengan jeda menaik.
const RETRY_DELAYS_MS = [3_000, 6_000, 10_000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(input: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
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
        contents: [
          {
            parts: [
              { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
              { text: input.prompt },
            ],
          },
        ],
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

/**
 * Edit gambar via Gemini image model (gemini-2.5-flash-image) — dipakai
 * Bagian B (susun ulang scene/latar dari foto asli). `prompt` yang menentukan
 * apa yang diedit/dipertahankan (lihat lib/ai/scenePrompt.ts).
 */
export async function editImage(input: {
  imageBase64: string;
  mimeType: string;
  aspectRatio: AspectRatio;
  prompt: string;
}): Promise<GeminiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Fitur AI belum aktif: GEMINI_API_KEY belum diisi di server." };
  }

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let response: Response;
    try {
      response = await callGemini({
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        apiKey,
        model: GEMINI_IMAGE_MODEL,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: "Permintaan ke AI terlalu lama (timeout). Coba lagi." };
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
        `Gagal menyusun ulang gambar (status ${response.status}).`;
      return { ok: false, error: message };
    }

    const data = await response.json().catch(() => null);
    const parts = (
      data as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] } | null
    )?.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((part) => part.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      return { ok: false, error: "AI tidak mengembalikan gambar. Coba lagi." };
    }

    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    return { ok: true, dataUri: `data:${mimeType};base64,${imagePart.inlineData.data}` };
  }

  return { ok: false, error: "Layanan AI sedang sibuk, coba lagi beberapa saat lagi." };
}
