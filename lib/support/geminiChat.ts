// Helper text chat untuk support widget.
// Panggil Gemini dulu; kalau gagal, fallback ke OpenAI (kalau OPENAI_API_KEY ada).
// Sengaja self-contained (tidak import dari lib/ai/*) supaya perubahan di sini
// tidak mempengaruhi flow generate konten yang sudah stabil.

type Message = { role: "system" | "user" | "assistant"; content: string };

type ChatResult = { ok: true; text: string } | { ok: false; error: string };

const TIMEOUT_MS = 30000;

export async function chatCompletion(messages: Message[]): Promise<ChatResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.1-flash-lite";
  const openaiKey = process.env.OPENAI_API_KEY;

  // ── Coba Gemini dulu ────────────────────────────────────────────────
  if (geminiKey) {
    try {
      const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
      const nonSystem = messages.filter((m) => m.role !== "system");
      const contents = nonSystem.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { ok: true, text };
      } else {
        console.warn(`[support] Gemini HTTP ${res.status}, coba OpenAI...`);
      }
    } catch (e) {
      console.warn("[support] Gemini exception, coba OpenAI:", e);
    }
  }

  // ── Fallback OpenAI ─────────────────────────────────────────────────
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.4,
          max_tokens: 500,
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content?.trim();
        if (text) return { ok: true, text };
        return { ok: false, error: "OpenAI response kosong" };
      }
      return { ok: false, error: `OpenAI HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "OpenAI error" };
    }
  }

  return { ok: false, error: "Tidak ada AI provider yang tersedia (GEMINI_API_KEY atau OPENAI_API_KEY belum di-set)" };
}
