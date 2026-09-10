// lib/ai/geminiVisionText.ts
// Helper Gemini Vision GENERIK (prompt custom, bukan cuma describeImage).
// Pola pemanggilan SENGAJA disalin persis dari lib/ai/describeImage.ts yang
// sudah terbukti jalan di /coba dan generate-auto — supaya tidak ada
// konfigurasi/koneksi ganda yang berbeda dari yang sudah dipakai project ini.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

/**
 * Kirim 1 gambar + prompt bebas ke Gemini, terima balasan teks mentah.
 * Dipakai oleh lib/ai/layoutDirectorFinal.ts (AI Art Director) — prompt-nya
 * sendiri yang minta balasan JSON, fungsi ini cuma jalur transportnya.
 *
 * MELEMPAR error kalau gagal (bukan return {ok:false}) — supaya
 * planLayoutFinal() di layoutDirectorFinal.ts (yang sudah punya try/catch +
 * fallback plan aman) yang menangani semua kegagalan di satu tempat.
 */
export async function callGeminiVisionForLayout(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diisi.");

  const res = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2000 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini vision HTTP ${res.status}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !text.trim()) throw new Error("Gemini vision balas kosong");
  return text;
}
