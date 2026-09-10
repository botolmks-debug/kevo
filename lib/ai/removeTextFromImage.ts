// lib/ai/removeTextFromImage.ts
// EKSPERIMENTAL — hapus semua teks yang sudah dibakar Gemini ke gambar,
// hasilkan versi BERSIH (tanpa teks) supaya teks bisa digambar ULANG sebagai
// FreeItem yang editable di atasnya. Reuse editImage() yang sudah ada
// (Gemini image-edit) — TIDAK ada mekanisme mask presisi, jadi hasilnya
// best-effort: kadang detail latar di sekitar teks ikut sedikit berubah,
// ini batasan nyata dari pendekatan "minta AI hapus", bukan bug.

import { editImage } from "./geminiImage";
import type { AspectRatio } from "../templates/types";

export interface RemoveTextResult {
  ok: boolean;
  dataUri?: string;
  error?: string;
}

const PROMPT_ID = `Hapus SEMUA teks/tulisan/tipografi yang ada di gambar ini (judul, subjudul, badge, label apa pun).
JANGAN ubah apa pun selain itu — produk, warna, latar, bentuk dekoratif, pencahayaan, komposisi HARUS TETAP SAMA PERSIS.
Area bekas teks diisi menyatu secara alami dengan latar di sekitarnya (seolah teks itu tidak pernah ada).
Hasil akhir: gambar yang identik dengan aslinya, HANYA MINUS semua tulisan.`;

const PROMPT_EN = `Remove ALL text/typography present in this image (headline, subheadline, badges, any label).
Do NOT change anything else — the product, colors, background, decorative shapes, lighting, and composition MUST remain EXACTLY the same.
Areas where text used to be should blend naturally with the surrounding background (as if the text was never there).
Final result: an image identical to the original, MINUS all text.`;

export async function removeTextFromImage(
  imageBase64: string,
  mimeType: string,
  aspectRatio: AspectRatio,
  lang: "id" | "en"
): Promise<RemoveTextResult> {
  const result = await editImage({
    imageBase64,
    mimeType,
    aspectRatio,
    prompt: lang === "en" ? PROMPT_EN : PROMPT_ID,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, dataUri: result.dataUri };
}
