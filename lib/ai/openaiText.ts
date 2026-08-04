export type OpenAITextResult = { ok: true; text: string } | { ok: false; error: string };
export type OpenAIJsonResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

export const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

const OPENAI_API_BASE = "https://api.openai.com/v1";
const REQUEST_TIMEOUT_MS = 30_000;

async function callChat(prompt: string, apiKey: string, jsonMode: boolean): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseError(body: unknown, status: number): string {
  const msg = (body as { error?: { message?: string } } | null)?.error?.message;
  return msg || `OpenAI gagal membuat konten (status ${status}).`;
}

/** Fallback untuk lib/ai/gemini.ts (caption biasa, teks bebas). */
export async function generateOpenAIText(prompt: string): Promise<OpenAITextResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi di server." };
  try {
    const res = await callChat(prompt, apiKey, false);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, res.status) };
    const text = (data as { choices?: { message?: { content?: string } }[] } | null)?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "OpenAI tidak mengembalikan teks." };
    return { ok: true, text: text.trim() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return { ok: false, error: "OpenAI terlalu lama merespons." };
    return { ok: false, error: "Gagal menghubungi OpenAI." };
  }
}

/** Fallback untuk lib/ai/geminiJson.ts (konten Otomatis: headline+caption+scene). */
export async function generateOpenAIJson(prompt: string): Promise<OpenAIJsonResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi di server." };
  try {
    const res = await callChat(prompt, apiKey, true);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, res.status) };
    const text = (data as { choices?: { message?: { content?: string } }[] } | null)?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "OpenAI tidak mengembalikan konten." };
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ok: true, data: parsed as Record<string, unknown> };
      }
      return { ok: false, error: "OpenAI mengembalikan format tidak valid." };
    } catch {
      return { ok: false, error: "OpenAI mengembalikan format tidak valid." };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return { ok: false, error: "OpenAI terlalu lama merespons." };
    return { ok: false, error: "Gagal menghubungi OpenAI." };
  }
}
