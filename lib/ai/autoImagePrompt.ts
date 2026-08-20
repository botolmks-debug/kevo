import { localeSceneNote, type Lang } from "@/lib/ai/lang";

// Berlaku untuk SEMUA jenis: gambar penuh edge-to-edge & tanpa teks/branding.
const FILL_NO_TEXT =
  "Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos/rata, tanpa bidang putih atau abu-abu kosong, tanpa border/bingkai. " +
  "Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau BRANDING apa pun di dalam gambar - termasuk pada objek seperti gelas, baju, papan, dinding, kemasan, atau PAPAN NAMA/SIGNAGE toko. Semua objek harus bersih tanpa tulisan. DILARANG KERAS membuat teks palsu/tidak terbaca (gibberish) di mana pun dalam gambar - foto harus 100% bebas huruf/kata, seperti foto asli tanpa desain grafis.";

// Larangan keras band gelap/polos - berlaku untuk General & Interaksi.
const NO_DARK_BAND =
  "DILARANG KERAS membuat area gelap, bayangan rata, gradien polos, atau bidang kosong di bagian mana pun (atas, bawah, samping). " +
  "Seluruh frame dari atas ke bawah dan kiri ke kanan WAJIB terisi detail gambar nyata (objek, latar, tekstur). " +
  "Teks overlay akan ditangani secara terpisah di luar gambar - JANGAN sisakan ruang untuk teks di mana pun.";

export function buildGeneralImagePrompt(scene: string, lang?: Lang): string {
  return `Foto editorial realistis berkualitas tinggi. Pencahayaan: INDOOR hangat dan lembut (warm tungsten/ambient), hindari cahaya harsh/terlalu terang - suasana cozy dan premium. Depth of field lembut, terasa nyata dan profesional - BUKAN ilustrasi atau kartun.
Adegan: ${scene}
Buat suasana dan lingkungan terasa autentik dan cocok dengan target pasar (bukan generik/stok).
${FILL_NO_TEXT}
${NO_DARK_BAND}
${localeSceneNote(lang)}`;
}

export function buildInteraksiImagePrompt(scene: string, lang?: Lang): string {
  return `Gambar bertema INTERAKSI/kehangatan komunitas antara bisnis dan pelanggannya. Boleh bergaya ilustrasi ceria, kartun modern, animasi, atau semi-realistis. Warna cerah, bentuk ramah, terasa hidup dan mengundang.
Adegan: ${scene}
PENTING: JANGAN menambahkan teks, huruf, angka, logo, atau branding apa pun pada objek dalam gambar (gelas, baju, tas, dinding, papan, dll). Semua objek harus BERSIH tanpa tulisan. JANGAN membuat logo atau inisial brand. Subjek dan latar harus tersebar memenuhi seluruh tinggi frame vertikal (9:16), bukan cuma menumpuk di tengah/bawah.
${FILL_NO_TEXT}
${NO_DARK_BAND}
${localeSceneNote(lang)}`;
}
