/**
 * Naskah VO untuk "Ringkas 15 Detik" (app/videocerita/singkat) — BEDA dari
 * ceritaPrompt.ts (yang bikin 5 segmen dari slide baru). Di sini sumbernya
 * CAPTION konten yang SUDAH ADA (gambar sudah jadi, tidak generate ulang),
 * jadi cuma 1 panggilan: caption -> 1 naskah lisan hook+ringkasan, hashtag
 * dibuang, dipatok ke ±15 detik bicara. `jenis` (dari generated_content:
 * produk/general/interaksi/berita) menentukan gaya penutup/CTA — lihat
 * ctaGuide di bawah, jangan pakai CTA jualan generik utk semua kategori.
 */
import type { Lang } from "@/lib/ai/lang";
import type { GeneratedContentJenis } from "@/lib/supabase/generatedContent";

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

/** Buang baris/kata hashtag dari caption sebelum dikirim ke AI (jaga-jaga
 * biar AI tidak ikut "membaca" tanda pagar kalau caption belum dirapikan). */
export function stripHashtags(caption: string): string {
  return caption
    .replace(/#\S+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function ctaGuideId(jenis?: GeneratedContentJenis): string {
  switch (jenis) {
    case "berita":
      return `Konten ini BERITA/opini, BUKAN jualan — penutup WAJIB ngarahin ke caption buat baca detail/pendapat lengkapnya (mis. "detailnya ada di caption", "pendapat lengkapnya cek caption"), JANGAN pakai ajakan beli/hubungi/kontak sama sekali.`;
    case "produk":
      return `Konten ini JUALAN PRODUK — penutup boleh ngarahin buat kontak/beli (mis. "hubungi kami aja", "cek link di bio buat pesan", "DM aja ya"), tapi ucapkan natural kayak saran temen, BUKAN kalimat CTA iklan formal ("pesan sekarang juga!").`;
    case "interaksi":
      return `Konten ini ajakan INTERAKSI/ngobrol — penutup WAJIB ngajak audiens ikut komentar/cerita balik (mis. "share dong pengalaman kamu di komen", "kamu gimana, sama nggak?"), JANGAN ajakan beli/kontak.`;
    default:
      return `Konten ini konten umum/edukasi — penutup natural aja, boleh ngajak mikir/komentar/cek caption, JANGAN maksa ajakan beli/kontak kalau captionnya sendiri gak jualan.`;
  }
}

function ctaGuideEn(jenis?: GeneratedContentJenis): string {
  switch (jenis) {
    case "berita":
      return `This is NEWS/opinion content, NOT a sales post — closing MUST point to the caption for full detail/opinion (e.g. "full take's in the caption"), do NOT use any buy/contact CTA.`;
    case "produk":
      return `This is PRODUCT/sales content — closing may point to contact/purchase (e.g. "just message us", "link's in bio"), but say it like a friend's tip, NOT a formal ad CTA.`;
    case "interaksi":
      return `This is an ENGAGEMENT/discussion post — closing MUST invite the audience to comment/share their own take, NOT a buy/contact CTA.`;
    default:
      return `This is general/educational content — natural closing, may invite a thought/comment/check the caption, do NOT force a buy/contact CTA if the caption itself isn't selling anything.`;
  }
}

export function buildCeritaSingkatPrompt(caption: string, jenis?: GeneratedContentJenis, lang?: Lang): string {
  const cleanCaption = stripHashtags(caption);

  if (isEn(lang)) {
    return `Turn this social media caption into a SHORT SPOKEN voice-over script for a short video (single continuous narration, not multiple segments):

CAPTION:
"""
${cleanCaption}
"""

RULES:
- Target 35-42 words total — must fit naturally in ~15 seconds of natural spoken pace (~2.4-2.8 words/second).
- Open with a HOOK: a punchy first line that grabs attention immediately (bold statement, surprising angle, or direct question) — do NOT start with a slow/generic warm-up.
- Summarize the caption's core message in your own natural spoken words — do not read the caption verbatim, and do not invent facts not present in the caption.
- Natural conversational tone, like a friend telling you about it out loud — not a formal announcer/ad-read voice. Use contractions, short fragments, natural pauses (commas, not essay-like structure).
- No hashtags, no emoji, no quotation marks, no labels like "Script:".
- CLOSING LINE: ${ctaGuideEn(jenis)}

Reply with ONLY valid JSON, no markdown fence, exactly:
{"script":"..."}`;
  }

  return `Ubah caption sosmed ini jadi naskah VOICE OVER LISAN untuk video pendek (satu narasi utuh mengalir, BUKAN beberapa segmen terpisah):

CAPTION:
"""
${cleanCaption}
"""

ATURAN:
- Target 35-42 kata total — harus pas dibacakan natural dalam ±15 detik (kecepatan bicara wajar ±2,4-2,8 kata/detik).
- Buka dengan HOOK: kalimat pembuka yang langsung nendang & bikin penasaran (pernyataan berani, sudut pandang mengejutkan, atau pertanyaan langsung) — JANGAN mulai dengan basa-basi lambat ("hai", "jadi gini", "eh tau nggak sih").
- Rangkum inti pesan caption pakai kata-katamu sendiri secara lisan — JANGAN membaca ulang caption kata per kata, dan JANGAN mengarang fakta baru yang tidak ada di caption.
- GAYA BAHASA WAJIB kayak orang beneran ngomong spontan ke kamera, BUKAN copywriting/iklan tertulis yang dibacakan, dan BUKAN esai yang disusun rapi lalu "dibaca". Ini bedanya:
  - JANGAN kalimat majemuk panjang yang disambung rapi pakai konjungsi formal ("sehingga", "oleh karena itu", "dengan demikian") — orang ngomong biasa gak gitu.
  - JANGAN kalimat imperatif gaya slogan ("Jangan buang energi, fokuslah pada...") atau pertanyaan retoris template ("Mau kerja lebih tenang?") — kedengeran template/iklan.
  - PECAH jadi kalimat-kalimat PENDEK yang berdiri sendiri, kayak orang mikir sambil ngomong (boleh mulai kalimat baru dengan "Soalnya...", "Jadi...", "Nah...").
  - WAJIB ada minimal 2-3 partikel/kontraksi obrolan natural tersebar di naskah ("nih", "sih", "loh", "kok", "banget", "kayak", "gitu", "udah", "aja") — bukan ditumpuk di satu kalimat, sebar natural.
  - Bayangkan kamu ngerekam voice note buat temen deket, bukan syuting VO iklan TV.
- Tanpa hashtag, tanpa emoji, tanpa tanda kutip, tanpa label seperti "Naskah:".
- KALIMAT PENUTUP: ${ctaGuideId(jenis)}

Balas HANYA JSON valid, tanpa fence markdown, persis:
{"script":"..."}`;
}
