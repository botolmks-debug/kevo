// lib/ai/fullDesignPrompt.ts
// Prompt untuk 1 kali edit gambar yang menghasilkan DESAIN LENGKAP —
// judul, subjudul, badge/highlight SEMUA dibakar langsung ke gambar oleh
// Gemini (bukan dioverlay Satori setelahnya). Beda total dari scenePrompt.ts
// (yang MELARANG keras teks apa pun di foto) — di sini kita MEMINTA teks,
// tapi TERKONTROL: cuma dari data produk asli, dan ruang bawah WAJIB
// dikosongkan untuk logo+sosmed Keposting yang ditempel belakangan.

import type { BusinessProfile } from "../onboarding/businessProfile";

export interface FullDesignPromptInput {
  profile: BusinessProfile;
  productDescription: string;
  lang: "id" | "en";
  /** Judul yang SUDAH dipilih user dari 5 pilihan (title picker yang sudah ada).
   * Kalau diisi, Gemini WAJIB pakai judul ini apa adanya (cuma didesain, bukan
   * ditulis ulang) — supaya koneksi ke data produk/usaha yang sudah benar di
   * tahap pemilihan judul tidak hilang begitu masuk ke desain final. */
  chosenHeadline?: string;
}

export function buildFullDesignPrompt(input: FullDesignPromptInput): string {
  const { profile, productDescription, lang, chosenHeadline } = input;
  const businessName = profile.business?.name || "";
  const industry = profile.business?.industry || "";
  const differentiator = profile.positioning?.differentiator || "";
  const mainProducts = profile.offering?.mainProducts || "";

  const dataBlock = lang === "en"
    ? `PRODUCT DATA (the ONLY source of truth for any text you add — do NOT invent facts, numbers, or claims not implied by this):
- Product shown in photo: ${productDescription || "(infer from the photo itself)"}
- Business: ${businessName || "(unnamed)"} — ${industry || "general business"}
- What they offer: ${mainProducts || "(not specified)"}
- What makes them different: ${differentiator || "(not specified)"}`
    : `DATA PRODUK (SATU-SATUNYA sumber kebenaran untuk teks apa pun yang kamu tambahkan — DILARANG mengarang fakta, angka, atau klaim yang tidak didukung data ini):
- Produk di foto: ${productDescription || "(simpulkan dari foto)"}
- Bisnis: ${businessName || "(tanpa nama)"} — ${industry || "usaha umum"}
- Yang dijual: ${mainProducts || "(tidak disebutkan)"}
- Pembeda dari kompetitor: ${differentiator || "(tidak disebutkan)"}`;

  const headlineInstructionEn = chosenHeadline
    ? `1. Use THIS EXACT headline (already chosen from the business's own data, do NOT change the wording): "${chosenHeadline}" — your job is ONLY to design/typeset it beautifully, not rewrite it.`
    : `1. Add a short, catchy HEADLINE (a few words, in the SAME language as the product data above) — must be TRUE to the product data, no fabricated claims/numbers/statistics.`;
  const headlineInstructionId = chosenHeadline
    ? `1. Pakai JUDUL INI PERSIS (sudah dipilih dari data bisnis sendiri, JANGAN ubah kata-katanya): "${chosenHeadline}" — tugasmu HANYA mendesain/mengatur tipografinya biar bagus, bukan menulis ulang.`
    : `1. Tambahkan JUDUL pendek yang menarik (beberapa kata) — HARUS sesuai data produk di atas, DILARANG mengarang klaim/angka/statistik.`;

  if (lang === "en") {
    return `You are a professional graphic designer creating a finished, ready-to-post social media marketing graphic — like a polished ad poster, not a plain photo.

${dataBlock}

TASK: Redesign this photo into a COMPLETE marketing graphic:
${headlineInstructionEn}
2. Optionally add ONE short supporting line under the headline.
3. Optionally add 2-3 SHORT highlight tags/badges (a few words each, e.g. a key benefit) — ONLY facts implied by the product data above, never invented.
4. Design freely: typography style, color accents, subtle shapes/icons, composition — make it look premium and intentional, like a professional ad, not a template.
5. Spelling MUST be correct — re-read every word you write before finalizing. Wrong spelling is a failed result.
6. Keep the product itself clearly visible and recognizable — do not obscure it with text/graphics.

STRICT TEXT LIMIT (critical — this is the #1 cause of failed results): the headline, ONE supporting line, and 2-3 badges above are the ONLY text allowed anywhere in the image. Do NOT add a fake phone/screen mockup, a fake app UI, a fake dashboard, fake paragraphs, fake buttons, or ANY other filler text/label/number — small decorative text like this almost always renders as garbled gibberish and ruins the result. Any extra decorative shape, icon, or illustration you add for visual interest MUST contain ZERO text, letters, or numbers of any kind.

CRITICAL LAYOUT RULE: leave the BOTTOM ${"12"}% of the frame (a horizontal strip along the very bottom edge) as a plain, uncluttered area — a simple solid color or soft gradient, NO text, NO icons, NO busy detail there. This space is reserved for a logo and social media handles that will be added separately afterward — anything you place there will be covered.

Output: ONE finished image, no instructions or captions outside the image itself.`;
  }

  return `Kamu adalah desainer grafis profesional yang membuat 1 gambar marketing SIAP POSTING — seperti poster iklan jadi, bukan sekadar foto polos.

${dataBlock}

TUGAS: Desain ulang foto ini jadi GRAFIS MARKETING LENGKAP:
${headlineInstructionId}
2. Opsional: 1 kalimat pendek pendukung di bawah judul.
3. Opsional: 2-3 badge/highlight PENDEK (beberapa kata, mis. 1 keunggulan) — HANYA dari data produk di atas, DILARANG mengarang.
4. Bebas berkreasi: gaya tipografi, aksen warna, bentuk/ikon dekoratif kecil, komposisi — buat terasa premium & niat, seperti iklan profesional, bukan template.
5. Ejaan WAJIB benar — baca ulang tiap kata sebelum menjawab. Salah eja = hasil gagal.
6. Produk itu sendiri tetap harus jelas terlihat & dikenali — jangan sampai tertutup teks/grafis.

BATAS TEKS KETAT (penyebab #1 hasil gagal): judul, 1 kalimat pendukung, dan 2-3 badge di atas itu SATU-SATUNYA teks yang boleh ada di gambar. JANGAN tambahkan mockup HP/layar palsu, UI aplikasi palsu, dashboard palsu, paragraf palsu, tombol palsu, atau LABEL/ANGKA apa pun lainnya — teks dekoratif kecil seperti itu HAMPIR SELALU jadi gibberish tidak terbaca dan merusak hasil. Bentuk/ikon/ilustrasi dekoratif tambahan yang kamu buat untuk mempercantik WAJIB TIDAK MENGANDUNG teks/huruf/angka sama sekali.

ATURAN LAYOUT PENTING: sisakan ${"12"}% BAGIAN BAWAH frame (pita horizontal di tepi paling bawah) sebagai area POLOS tanpa hiasan — warna solid sederhana atau gradient lembut, TANPA teks, TANPA ikon, TANPA detail ramai di situ. Area ini disiapkan untuk logo & akun sosial media yang akan ditempel terpisah setelahnya — apa pun yang kamu taruh di situ akan tertutup.

Output: SATU gambar jadi, tanpa instruksi atau caption di luar gambar itu sendiri.`;
}
