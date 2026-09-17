import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export type LogoStyle = "typography" | "icon" | "auto";

export const LOGO_STYLES: { key: LogoStyle; label: string }[] = [
  { key: "typography", label: "Tipografi" },
  { key: "icon", label: "Ikonik" },
  { key: "auto", label: "Bebas AI" },
];

const STYLE_BRIEF: Record<LogoStyle, string> = {
  typography:
    "GAYA WAJIB: Wordmark/lettermark — logo BERBASIS TIPOGRAFI. Fokus utama di kualitas huruf " +
    "kustom (letterform), spacing, dan pemilihan/pairing font yang terasa dirancang khusus " +
    "(bukan font default). Boleh ada aksen kecil (garis, titik, bentuk geometris minimal) yang " +
    "menyatu dengan huruf, TAPI TIDAK BOLEH ada ikon/simbol besar terpisah dari teks nama usaha.",
  icon:
    "GAYA WAJIB: Icon/symbol-forward — buat SATU mark/simbol yang kuat dan bisa berdiri sendiri " +
    "(harus tetap dikenali walau wordmark dihilangkan, seperti app-icon). Mark ini jadi elemen " +
    "PALING DOMINAN, wordmark nama usaha diletakkan lebih kecil di bawah atau di samping. " +
    "Ambil SATU motif ikon yang relevan dan lazim dipakai brand sejenis di industri ini " +
    "(misal: untuk brand seputar konten/media-sosial, motif umum yang terbukti efektif di " +
    "industri itu antara lain speech bubble, megaphone, play button, lensa kamera, kalender+centang, " +
    "ujung pena, atau panah/roket melambangkan pertumbuhan — pilih SATU yang paling relevan dan " +
    "sederhanakan jadi bentuk geometris flat, JANGAN gabungkan banyak motif sekaligus).",
  auto:
    "GAYA: Bebas — kamu (AI) pilih sendiri pendekatan terbaik untuk brand ini berdasarkan nama, " +
    "industri, dan positioning-nya (bisa monogram, mascot minimal, abstract mark, dsb), tetap " +
    "berpijak pada konvensi visual yang lazim dan terbukti dipakai brand sejenis di industri ini " +
    "(bukan bentuk asal-asalan). Ambil keputusan desain paling tepat, jangan asal random.",
};

export function buildLogoPrompt(profile: BusinessProfile, style: LogoStyle = "auto"): string {
  const name = profile.business.name || "usaha ini";
  const industry = profile.business.industry ? ` di bidang ${profile.business.industry}` : "";
  const differentiator = profile.positioning.differentiator
    ? ` Ciri khas usaha: ${profile.positioning.differentiator}.`
    : "";
  const tone = profile.positioning.tone ? ` Kesan yang ingin ditampilkan: ${profile.positioning.tone}.` : "";
  const product = profile.offering.flagshipProduct
    ? ` Produk utama: ${profile.offering.flagshipProduct}.`
    : "";

  return `
Kamu desainer logo profesional senior, portofolio setara pemenang penghargaan di
Behance/Dribbble/Logo Lounge. Sebelum mendesain, pikirkan dulu (secara internal, jangan
ditulis) konvensi visual yang LAZIM dipakai brand sukses di industri sejenis — lalu terapkan
konvensi itu dengan interpretasi ORISINAL, bukan meniru satu brand tertentu secara identik.

Buat logo bisnis untuk usaha bernama "${name}"${industry}.
${differentiator}${tone}${product}

${STYLE_BRIEF[style]}

ATURAN WAJIB (berlaku untuk semua gaya):
- Modern, simpel, flat/vector, BERSIH dan MEMORABLE. BUKAN foto realistis, BUKAN mockup 3D,
  BUKAN clipart generik/tipis ala stok gratisan, BUKAN ilustrasi rumit penuh detail kecil.
- FLAT FILL SOLID — JANGAN pakai outline/stroke/garis kontur di sekeliling huruf atau ikon
  (tidak ada efek "sticker outline" atau garis tepi ganda). Bentuk cukup diisi warna solid,
  tanpa garis pembatas tambahan.
- Elemen visual harus BESAR dan mengisi porsi signifikan dari frame (bukan kecil di pojok),
  bentuk tegas dan solid, tetap jelas dikenali di ukuran sangat kecil (favicon 32x32px).
- Nama usaha HARUS dieja PERSIS "${name}" tanpa typo, tanpa huruf tambahan, tanpa kata lain.
- Maksimal 2 warna utama + 1 warna aksen, kontras tinggi, palet profesional (bukan neon norak
  kecuali memang relevan dengan brand).
- Komposisi TERPUSAT dengan margin kosong secukupnya di sekeliling logo.
- Latar belakang WAJIB warna magenta solid #FF00FF RATA (flat, tanpa gradasi, tanpa tekstur,
  tanpa bayangan/vignette apa pun yang jatuh ke latar) — ini instruksi teknis paling penting
  supaya latar bisa dihapus otomatis nanti, JANGAN diabaikan walau elemen desainnya berwarna
  gelap/hitam.
- JANGAN sertakan watermark, JANGAN teks tambahan selain nama usaha, JANGAN bingkai/frame/mockup.
`.trim();
}
