import { GEMINI_TEXT_MODEL } from "./gemini";
import { generateOpenAIJson } from "./openaiText";

export type GeminiJsonResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// gemini-3-flash-preview kadang lebih lambat, dan konten Otomatis (JSON
// headline+caption+scene sekaligus) butuh output lebih panjang dari caption
// biasa — 20 detik terlalu ketat, sering keburu timeout & jatuh ke OpenAI
// padahal Gemini masih akan berhasil kalau ditunggu sedikit lagi.
const REQUEST_TIMEOUT_MS = 45_000;
// Konten auto-generate (headline+caption+scene sekaligus) butuh token lebih
// banyak dari caption biasa (lib/ai/gemini.ts pakai 200).
const MAX_OUTPUT_TOKENS = 1024;
// Retry hanya untuk 503 "high demand": maks 3x percobaan ulang dengan jeda menaik.
const RETRY_DELAYS_MS = [3_000, 6_000, 10_000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Gemini kadang tetap membungkus JSON dengan fence markdown walau
// responseMimeType sudah diminta application/json — bersihkan dulu sebelum
// parse (pola sama dengan referensi botolmakassar, lihat reference/).
function parseJsonText(text: string): Record<string, unknown> | null {
  let cleaned = text.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Panggil Gemini text model dan minta output JSON — dipakai tab Generate
 * Otomatis untuk dapat headline+caption+deskripsi scene sekaligus dalam satu
 * panggilan (lihat lib/ai/autoContentPrompt.ts untuk bentuk prompt & JSON-nya).
 */
async function generateJsonContentGemini(prompt: string): Promise<GeminiJsonResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Fitur AI belum aktif: GEMINI_API_KEY belum diisi di server." };
  }

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let response: Response;
    try {
      response = await callGemini(prompt, apiKey, GEMINI_TEXT_MODEL);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < RETRY_DELAYS_MS.length) {
          await wait(RETRY_DELAYS_MS[attempt]);
          continue;
        }
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
        error: `Model AI "${GEMINI_TEXT_MODEL}" tidak ditemukan/tidak didukung lagi. Set env GEMINI_TEXT_MODEL ke model yang masih aktif.`,
      };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { error?: { message?: string } } | null)?.error?.message ??
        `Gagal membuat konten (status ${response.status}).`;
      return { ok: false, error: message };
    }

    const data = await response.json().catch(() => null);
    const text = (
      data as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null
    )?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
      return { ok: false, error: "AI tidak mengembalikan konten. Coba lagi." };
    }

    const parsed = parseJsonText(text);
    if (!parsed) {
      return { ok: false, error: "AI mengembalikan format tidak valid. Coba lagi." };
    }
    return { ok: true, data: parsed };
  }

  return { ok: false, error: "Layanan AI sedang sibuk, coba lagi beberapa saat lagi." };
}

/**
 * Titik masuk publik: coba Gemini dulu; kalau gagal total DAN
 * OPENAI_API_KEY tersedia, otomatis dialihkan ke OpenAI sebagai cadangan.
 * Dipakai tab Generate Otomatis (headline+caption+scene sekaligus).
 */
export async function generateJsonContent(prompt: string): Promise<GeminiJsonResult> {
  const result = await generateJsonContentGemini(prompt);
  if (result.ok) return result;
  if (!process.env.OPENAI_API_KEY) return result;
  console.warn("Gemini gagal (" + result.error + "), mencoba fallback OpenAI...");
  return generateOpenAIJson(prompt);
}
