import type { AspectRatio } from "@/lib/templates/types";

export type OpenAIImageResult = { ok: true; dataUri: string } | { ok: false; error: string };

// Model default aman & terdokumentasi. Bisa diganti tanpa ubah kode lewat
// env kalau OpenAI merilis model baru (mis. "gpt-image-2") di kemudian hari.
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

const OPENAI_API_BASE = "https://api.openai.com/v1";
const REQUEST_TIMEOUT_MS = 120_000;

// OpenAI images API hanya menerima ukuran tetap (bukan rasio bebas seperti
// Gemini) — dipetakan ke yang paling mendekati. Ini fallback darurat, jadi
// pendekatan ini cukup; kualitas utama tetap dari Gemini.
function sizeForAspect(aspectRatio: AspectRatio): string {
  if (aspectRatio === "1:1") return "1024x1024";
  return "1024x1536"; // potret — dipakai untuk 9:16 maupun 4:5
}

function parseOpenAIError(body: unknown, status: number): string {
  const msg = (body as { error?: { message?: string } } | null)?.error?.message;
  return msg || `OpenAI gagal membuat gambar (status ${status}).`;
}

async function toDataUriFromResponseJson(data: unknown): Promise<OpenAIImageResult> {
  const item = (data as { data?: { b64_json?: string; url?: string }[] } | null)?.data?.[0];
  if (item?.b64_json) {
    return { ok: true, dataUri: `data:image/png;base64,${item.b64_json}` };
  }
  if (item?.url) {
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      return { ok: true, dataUri: `data:image/png;base64,${buf.toString("base64")}` };
    } catch {
      return { ok: false, error: "Gagal mengunduh hasil gambar dari OpenAI." };
    }
  }
  return { ok: false, error: "OpenAI tidak mengembalikan gambar." };
}

/** Generate gambar dari nol (fallback untuk General & Interaksi). */
export async function generateOpenAIImage(input: {
  prompt: string;
  aspectRatio: AspectRatio;
}): Promise<OpenAIImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi di server." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt: input.prompt,
        size: sizeForAspect(input.aspectRatio),
        quality: "medium", // patok biaya fallback (~$0.04-0.06/gambar, bukan auto/high $0.17-0.25)
        n: 1,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseOpenAIError(data, res.status) };
    return await toDataUriFromResponseJson(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "OpenAI terlalu lama merespons." };
    }
    return { ok: false, error: "Gagal menghubungi OpenAI." };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Edit gambar dari foto asli (fallback untuk konten Produk). */
export async function editOpenAIImage(input: {
  imageBase64: string;
  mimeType: string;
  aspectRatio: AspectRatio;
  prompt: string;
}): Promise<OpenAIImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi di server." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Endpoint edit OpenAI butuh multipart/form-data, beda dari generate (JSON).
    const form = new FormData();
    form.append("model", OPENAI_IMAGE_MODEL);
    form.append("prompt", input.prompt);
    form.append("size", sizeForAspect(input.aspectRatio));
    form.append("quality", "medium"); // patok biaya fallback (bukan auto/high)
    const buffer = Buffer.from(input.imageBase64, "base64");
    form.append("image", new Blob([buffer], { type: input.mimeType }), "source.png");

    const res = await fetch(`${OPENAI_API_BASE}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseOpenAIError(data, res.status) };
    return await toDataUriFromResponseJson(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "OpenAI terlalu lama merespons." };
    }
    return { ok: false, error: "Gagal menghubungi OpenAI." };
  } finally {
    clearTimeout(timeoutId);
  }
}
