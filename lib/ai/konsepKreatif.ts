import type { Lang } from "@/lib/ai/lang";

/**
 * IDE KREATIF AI — khusus jenis "General" (Generate Otomatis).
 *
 * Setiap kali generate, AI (model ide yang lebih kuat, lihat
 * lib/ai/ideKreatifPrompt.ts + /api/generate-auto/ideas) MEMIKIRKAN sendiri
 * 5 ide konten tidak biasa dari data usaha user. Tiap ide sudah membawa
 * PROMPT GAMBAR LENGKAP (promptGambar) + teks persis di dalam gambar
 * (teksGambar). Prompt itu dikirim LANGSUNG ke model gambar — tidak ditulis
 * ulang lagi oleh model caption yang lebih ringan — supaya gambar setia
 * pada idenya (sama seperti kalau idenya di-copy-paste manual ke Gemini).
 *
 * File ini aman di-import dari client (tidak ada import server).
 */

export type KreatifIde = {
  /** Nama singkat ide, mis. "Struk belanja masalah pelanggan". */
  nama: string;
  emoji: string;
  /** 1-2 kalimat untuk user: gambarnya seperti apa & kenapa menarik. */
  deskripsi: string;
  /** Judul overlay (onImageText) yang diusulkan. */
  judul: string;
  /** Prompt gambar LENGKAP & detail, siap dikirim ke model gambar. */
  promptGambar: string;
  /** Teks persis yang harus muncul DI DALAM gambar (boleh kosong). */
  teksGambar: string[];
};

const LIMITS = { nama: 80, emoji: 16, deskripsi: 500, judul: 120, promptGambar: 3000 };
const MAX_TEKS = 12;
const MAX_TEKS_LEN = 80;

/** Validasi objek ide (dari AI maupun dari client). */
export function isValidIde(x: unknown): x is KreatifIde {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  for (const k of ["nama", "deskripsi", "judul", "promptGambar"] as const) {
    const v = r[k];
    if (typeof v !== "string" || v.trim().length === 0 || v.length > LIMITS[k]) return false;
  }
  if (r.emoji !== undefined && (typeof r.emoji !== "string" || r.emoji.length > LIMITS.emoji)) return false;
  if (r.teksGambar !== undefined) {
    if (!Array.isArray(r.teksGambar) || r.teksGambar.length > MAX_TEKS) return false;
    if (!r.teksGambar.every((t) => typeof t === "string" && t.length <= MAX_TEKS_LEN)) return false;
  }
  return true;
}

/**
 * Rapikan ide dari AI: emoji default, teksGambar selalu array bersih.
 * businessName (opsional): baris teks yang menyebut nama usaha DIBUANG —
 * kalau nama usaha ada di dalam gambar, AI gambar cenderung "mendesain"
 * logo palsu sendiri. Logo & nama ASLI sudah ditempel app (logo + footer).
 */
export function normalizeIde(ide: KreatifIde, businessName?: string): KreatifIde {
  const name = businessName?.trim().toLowerCase();
  return {
    ...ide,
    emoji: ide.emoji?.trim() || "💡",
    teksGambar: (Array.isArray(ide.teksGambar) ? ide.teksGambar : [])
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !(name && name.length >= 3 && t.toLowerCase().includes(name)))
      .slice(0, MAX_TEKS),
  };
}

/** Blok instruksi untuk AI PENULIS caption. Disuntik lewat `extra`. */
export function kreatifTextBlock(ide: KreatifIde, lang?: Lang): string {
  return lang === "en"
    ? `============================================
CREATIVE IDEA OF THIS POST (MANDATORY) — "${ide.nama}"
${ide.deskripsi}
The image shows: ${ide.promptGambar}
The caption must build on this exact idea (continue the joke/story/metaphor of the image), then connect it naturally to the business above. Don't describe the image literally.
============================================`
    : `============================================
IDE KREATIF POSTINGAN INI (WAJIB) — "${ide.nama}"
${ide.deskripsi}
Gambarnya: ${ide.promptGambar}
Caption WAJIB melanjutkan ide ini (lanjutkan lelucon/cerita/perumpamaan di gambarnya), lalu sambungkan secara natural ke usaha di atas. Jangan mendeskripsikan gambarnya secara harfiah.
============================================`;
}

/**
 * Pengganti baris imageScene di prompt General saat ide kreatif aktif.
 * Gambar TIDAK memakai imageScene ini (pakai promptGambar langsung) —
 * cukup isi singkat supaya format JSON lama tetap valid.
 */
export function kreatifSceneRule(ide: KreatifIde): string {
  return `imageScene = tulis saja: "${ide.nama.replace(/"/g, "'")}"`;
}

/** Prompt gambar ide kreatif: promptGambar dari model ide + aturan minimal. */
export function buildKreatifImagePrompt(ide: KreatifIde, lang?: Lang, businessName?: string): string {
  const textLang = lang === "en" ? "English" : "Bahasa Indonesia";
  const teks = ide.teksGambar.length
    ? `\n\nTEKS DI DALAM GAMBAR — tulis PERSIS seperti ini (${textLang}), huruf demi huruf, ejaan benar, tajam & terbaca, menyatu dengan objeknya (tercetak/di layar/tulisan tangan, ikut perspektif & cahaya):\n${ide.teksGambar.map((t) => `- "${t}"`).join("\n")}\nSelain teks di atas, JANGAN ada tulisan lain, huruf acak, atau teks palsu di mana pun.`
    : `\n\nGambar ini TANPA tulisan apa pun — jangan ada huruf, angka, atau teks palsu di mana pun.`;
  return `${ide.promptGambar}${teks}

Aturan tambahan:
- DILARANG KERAS menggambar LOGO, lambang, wordmark, atau ikon merek APA PUN — termasuk logo/nama usaha ini${businessName?.trim() ? ` ("${businessName.trim()}")` : ""}. Logo asli usaha akan ditempel terpisah oleh aplikasi, jadi di gambar TIDAK BOLEH ada versi buatan sendiri.
- Jangan gambar ikon aplikasi yang mirip merek asli (Facebook, Instagram, WhatsApp, Gmail, TikTok, Apple, Android, dll). Kalau butuh ikon di layar, pakai bentuk polos generik (kotak/lingkaran warna tanpa simbol merek).
- Jangan tampilkan orang terkenal.
- SATU foto/gambar utuh yang MENYAMBUNG dari atas sampai bawah. DILARANG membagi gambar jadi panel, strip, atau pita terpisah; DILARANG ada garis batas/sambungan horizontal; DILARANG mengulang/menduplikasi potongan gambar di bagian bawah; DILARANG pita gelap/polos di tepi mana pun.
- Objek utama boleh sedikit di atas tengah; bagian bawah cukup kelanjutan alami dari latar yang sama (meja/lantai/dinding yang sama), bukan area terpisah.
- Gambar penuh sampai keempat tepi, sudut tegas, tanpa bingkai, tanpa vignette.`;
}
