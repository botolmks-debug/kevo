// Ditulis self-contained (panggil Gemini REST langsung) supaya tidak bergantung
// pada signature fungsi di lib/ai/geminiImage.ts yang mungkin beda dari dugaan.
// Kalau geminiImage.ts sudah punya fungsi generate gambar dari prompt teks saja
// (tanpa foto input), lebih baik reuse fungsi itu & hapus file ini.

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export async function generateLogoImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini image error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );
  const base64 = part?.inlineData?.data;
  if (!base64) throw new Error("Gemini tidak mengembalikan gambar logo");

  return Buffer.from(base64, "base64");
}
