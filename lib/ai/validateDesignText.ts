// lib/ai/validateDesignText.ts
// Setelah Gemini bakar teks langsung ke gambar (fullDesignPrompt.ts), ada
// risiko nyata teks jadi rangkaian huruf ACAK/GIBBERISH (bukti nyata: "FLEGA
// NI", "PBYSOAY", "behembocrenmanliest" dari hasil generate sebelumnya).
// Fungsi ini kirim balik gambar hasil ke Gemini Vision untuk cek — TAPI
// versi ini DIPERKETAT supaya TIDAK false-positive terhadap nama brand
// (mis. "LUNÉRA") atau kata serapan asing yang memang disengaja
// (mis. "sophisticated" dicampur di kalimat Indonesia) — itu wajar dalam
// copywriting marketing, BUKAN kesalahan.

export interface ValidationResult {
  valid: boolean;
  issues?: string; // deskripsi singkat masalah kalau valid=false, buat log
}

function buildPrompt(lang: "id" | "en", brandName?: string): string {
  const brandNote = brandName
    ? (lang === "en"
        ? `\nThe business/brand name is "${brandName}" — if it appears in the image (even stylized/with accents), that is CORRECT, do not flag it.`
        : `\nNama bisnis/brand-nya adalah "${brandName}" — kalau muncul di gambar (walau bergaya/pakai aksen), itu BENAR, jangan ditandai.`)
    : "";

  if (lang === "en") {
    return `Look at this image carefully. Read all text written INSIDE the image.

Your ONLY job: detect if any word is a RANDOM GARBLED SEQUENCE OF LETTERS that is NOT a real word in ANY language and NOT a plausible brand/product name (e.g. "flega ni", "pbysoay", "behembocrenmanliest" — nonsense, not real words).

Do NOT flag: brand/product names (even invented/stylized ones), foreign loanwords intentionally mixed in for style (e.g. an English word inside an Indonesian sentence), accented characters, or minor stylistic phrasing choices. Those are normal and CORRECT.${brandNote}

Reply with ONLY ONE of:
- "VALID" — if there is NO random garbled/nonsense text
- "INVALID: <quote the exact garbled text>" — if there IS at least one clearly nonsensical letter sequence
Nothing else.`;
  }

  return `Lihat gambar ini dengan teliti. Baca semua teks yang tertulis DI DALAM gambar.

Tugasmu SATU-SATUNYA: deteksi apakah ada kata yang berupa RANGKAIAN HURUF ACAK/GIBBERISH yang BUKAN kata nyata dalam bahasa apa pun dan BUKAN nama brand/produk yang masuk akal (contoh: "flega ni", "pbysoay", "behembocrenmanliest" — itu bukan kata, cuma huruf acak).

JANGAN tandai: nama brand/produk (walau dibuat-buat/bergaya unik), kata serapan asing yang sengaja dicampur untuk gaya bahasa (mis. 1 kata Bahasa Inggris di tengah kalimat Indonesia), huruf beraksen, atau pilihan gaya bahasa yang sedikit tidak baku. Itu semua wajar dan BENAR.${brandNote}

Balas HANYA salah satu:
- "VALID" — kalau TIDAK ADA teks acak/gibberish
- "INVALID: <kutip persis teks acaknya>" — kalau ADA minimal 1 rangkaian huruf yang jelas tidak masuk akal
Tidak ada penjelasan lain.`;
}

export async function validateDesignText(
  imageBase64: string,
  mimeType: string,
  lang: "id" | "en",
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>,
  brandName?: string
): Promise<ValidationResult> {
  try {
    const prompt = buildPrompt(lang, brandName);
    const response = await callGeminiVision(prompt, imageBase64, mimeType);
    const trimmed = response.trim();
    if (/^VALID/i.test(trimmed)) return { valid: true };
    return { valid: false, issues: trimmed.slice(0, 200) };
  } catch (err) {
    // Validasi gagal (API error dll) -> jangan blokir hasil, anggap valid
    // best-effort (lebih baik lolos daripada gagal generate total).
    console.error("[validateDesignText] error, dianggap valid:", err);
    return { valid: true };
  }
}
