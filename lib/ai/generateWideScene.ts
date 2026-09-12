// lib/ai/generateWideScene.ts
// EKSPERIMENTAL — generate 1 foto LEBAR (rasio 16:9) yang nanti dipotong jadi
// 2 bagian (kiri/kanan) untuk 2 slide carousel yang terasa "1 momen, 1
// tempat" yang sama, bukan 2 foto terpisah yang cuma mirip gaya.
//
// Kenapa panggil Gemini langsung (bukan generateImage() yang sudah ada):
// tipe AspectRatio project ini SENGAJA dibatasi ke "4:5"|"1:1"|"9:16" (dipakai
// di Record<AspectRatio,...> di seluruh sistem template) — menambah rasio
// baru ke situ bisa berdampak luas ke semua template lain. Untuk kebutuhan
// SEMENTARA/eksperimental ini, lebih aman bikin jalur terpisah yang tidak
// menyentuh tipe inti sama sekali.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const REQUEST_TIMEOUT_MS = 120_000;

export type WideSceneResult = { ok: true; dataUri: string } | { ok: false; error: string };

export async function generateWideScene(prompt: string): Promise<WideSceneResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY belum diisi." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          // "16:9" didukung native oleh Gemini image generation (bukan bagian
          // dari daftar rasio terbatas project ini) — dikirim sebagai string
          // biasa, tidak lewat tipe AspectRatio yang dibatasi.
          imageConfig: { aspectRatio: "16:9" },
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Gemini gagal (${res.status}): ${body.slice(0, 300)}` };
    }

    const data = await res.json().catch(() => null);
    const parts = (
      data as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] } | null
    )?.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p) => p.inlineData?.data);

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
