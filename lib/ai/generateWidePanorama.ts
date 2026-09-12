// lib/ai/generateWidePanorama.ts
// EKSPERIMENTAL — generate 1 foto PANORAMA (rasio 21:9, batas terlebar yang
// didukung Gemini image generation) yang nanti dipotong jadi 4 bagian untuk
// 4 slide carousel. Beda dari percobaan sebelumnya: kalau ada foto produk
// ASLI (fotoBase64), foto itu dikirim sebagai INPUT gambar ke generate-nya
// (bukan foto lebar dibuat dulu baru produk ditempel belakangan) — supaya
// AI benar-benar menganyam produknya jadi bagian dari panorama, bukan
// tempelan yang terasa asing.
//
// Kenapa jalur terpisah (bukan editImage()/generateImage() yang sudah ada):
// tipe AspectRatio project ini SENGAJA dibatasi ke "4:5"|"1:1"|"9:16" —
// menambah rasio ke situ berisiko luas ke semua template lain. Ini jalur
// mandiri, tidak menyentuh tipe inti sama sekali.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const REQUEST_TIMEOUT_MS = 120_000;
const PANORAMA_ASPECT_RATIO = "21:9"; // rasio terlebar yang didukung native oleh Gemini image generation

export type PanoramaResult = { ok: true; dataUri: string } | { ok: false; error: string };

export async function generateWidePanorama(
  prompt: string,
  referencePhoto?: { base64: string; mimeType: string } | null,
): Promise<PanoramaResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY belum diisi." };

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = referencePhoto
    ? [{ inlineData: { mimeType: referencePhoto.mimeType, data: referencePhoto.base64 } }, { text: prompt }]
    : [{ text: prompt }];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: PANORAMA_ASPECT_RATIO },
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Gemini gagal (${res.status}): ${body.slice(0, 300)}` };
    }

    const data = await res.json().catch(() => null);
    const responseParts = (
      data as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] } | null
    )?.candidates?.[0]?.content?.parts;
    const imagePart = responseParts?.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) return { ok: false, error: "AI tidak mengembalikan gambar. Coba lagi." };

    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    return { ok: true, dataUri: `data:${mimeType};base64,${imagePart.inlineData.data}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal generate gambar.";
    return { ok: false, error: msg.includes("abort") ? "AI terlalu lama merespons. Coba lagi." : msg };
  } finally {
    clearTimeout(timeoutId);
  }
}
