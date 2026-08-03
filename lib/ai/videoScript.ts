import { generateCaption } from "@/lib/ai/gemini";

type ScriptResult = { ok: true; script: string } | { ok: false; error: string };

/**
 * Ubah caption media sosial (panjang, penuh emoji/hashtag) menjadi NASKAH LISAN
 * ~15 detik yang enak dibacakan avatar HeyGen.
 */
export async function buildVideoScript(caption: string): Promise<ScriptResult> {
  const prompt = `Ubah caption media sosial berikut menjadi NASKAH LISAN singkat untuk video promosi yang dibacakan seorang presenter, dalam Bahasa Indonesia.

Aturan WAJIB:
- Maksimal 40 kata (sekitar 12-15 detik saat dibaca dengan tempo santai).
- Bahasa lisan yang natural, hangat, dan mengajak — seperti orang ngobrol, BUKAN gaya tulisan caption.
- HILANGKAN semua hashtag, emoji, tanda pagar (#), dan tautan.
- Jangan menyebut "caption" atau memberi label apa pun.
- Balas HANYA naskahnya saja: tanpa tanda kutip, tanpa penjelasan, tanpa daftar.

Caption:
${caption}`;

  const res = await generateCaption(prompt);
  if (!res.ok) return res;

  // Bersihkan sisa hashtag/emoji seadanya + rapikan spasi.
  const script = res.text
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!script) return { ok: false, error: "Gagal membuat naskah dari caption. Coba lagi." };
  return { ok: true, script };
}
