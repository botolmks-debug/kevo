// lib/ai/describeImage.ts
// Analisis 1 foto produk -> deskripsi teks singkat, dipakai supaya judul & caption
// demo NYAMBUNG dengan produk asli di foto (bukan generik dari tipe bisnis).
// Mengirim gambar ke Gemini text model (inlineData) — pola sama dgn geminiImage.ts.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

export type DescribeResult =
  | { ok: true; description: string }
  | { ok: false; error: string };

/**
 * Kembalikan deskripsi produk 1-2 kalimat dari foto:
 * apa produknya, jenis/varian, warna/kemasan, merek kalau terbaca jelas.
 * Dipakai sebagai `sourceImage.description` untuk buildProdukContentPrompt.
 */
export async function describeProductImage(input: {
  imageBase64: string;
  mimeType: string;
  lang?: "id" | "en";
}): Promise<DescribeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY belum diisi." };
  }

  const instruction =
    (input.lang ?? "id") === "en"
      ? `Look at this product photo. In ONE or TWO short sentences, describe the MAIN product a small business would sell here: what it is, its type/variant, color/packaging, and the brand name ONLY if clearly legible. If the photo shows a person, focus on the product they hold or wear. Reply with the description only — no preamble, no quotes.`
      : `Lihat foto produk ini. Dalam SATU atau DUA kalimat pendek, jelaskan PRODUK UTAMA yang dijual sebuah usaha kecil di sini: apa produknya, jenis/varian, warna/kemasan, dan nama merek HANYA kalau jelas terbaca. Kalau foto menampilkan orang, fokus ke produk yang dipegang/dipakai. Jawab deskripsinya saja — tanpa basa-basi, tanpa tanda kutip.`;

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
                { text: instruction },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Gemini vision HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const description = String(text || "").trim();
    if (!description) {
      return { ok: false, error: "deskripsi kosong" };
    }
    return { ok: true, description };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "gagal analisis foto" };
  }
}
