import { localeSceneNote, type Lang } from "@/lib/ai/lang";

// Berlaku untuk SEMUA jenis: gambar penuh edge-to-edge & tanpa teks/branding.
const FILL_NO_TEXT =
  "Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos/rata, tanpa bidang putih atau abu-abu kosong, tanpa border/bingkai. " +
  "Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau BRANDING apa pun di dalam gambar - termasuk pada objek seperti gelas, baju, papan, dinding, kemasan, atau PAPAN NAMA/SIGNAGE toko. Semua objek harus bersih tanpa tulisan. DILARANG KERAS membuat teks palsu/tidak terbaca (gibberish) di mana pun dalam gambar - foto harus 100% bebas huruf/kata, seperti foto asli tanpa desain grafis.";

// HANYA untuk template yang punya scrim gelap di bawah (General/Produk).
// Interaksi TIDAK memakai ini karena scrim-nya sudah dihapus - kalau tetap
// dipakai, bagian bawah jadi bidang kosong/abu-abu yang kelihatan.
const BOTTOM_CALM_FOR_TEXT =
  "Bagian bawah sekitar sepertiga tinggi gambar akan ditutup lapisan gelap tipis berisi teks - buat area itu sedikit lebih tenang supaya teks terbaca, TAPI tetap berisi gambar/detail, JANGAN dikosongkan menjadi bidang polos.";

export function buildGeneralImagePrompt(scene: string, lang?: Lang): string {
  return `Foto editorial realistis berkualitas tinggi. Pencahayaan: INDOOR hangat dan lembut (warm tungsten/ambient), hindari cahaya harsh/terlalu terang - suasana cozy dan premium. Depth of field lembut, terasa nyata dan profesional - BUKAN ilustrasi atau kartun.
Adegan: ${scene}
Buat suasana dan lingkungan terasa autentik dan cocok dengan target pasar (bukan generik/stok).
${FILL_NO_TEXT} ${BOTTOM_CALM_FOR_TEXT}
${localeSceneNote(lang)}`;
}

export function buildInteraksiImagePrompt(scene: string, lang?: Lang): string {
  return `Gambar bertema INTERAKSI/kehangatan komunitas antara bisnis dan pelanggannya. Boleh bergaya ilustrasi ceria, kartun modern, animasi, atau semi-realistis. Warna cerah, bentuk ramah, terasa hidup dan mengundang.
Adegan: ${scene}
PENTING: JANGAN menambahkan teks, huruf, angka, logo, atau branding apa pun pada objek dalam gambar (gelas, baju, tas, dinding, papan, dll). Semua objek harus BERSIH tanpa tulisan. JANGAN membuat logo atau inisial brand. Isi SELURUH bingkai dengan adegan dari ATAS sampai BAWAH dan dari kiri ke kanan - JANGAN sisakan area kosong/polos di bagian ATAS, bawah, maupun samping. Subjek dan latar harus tersebar memenuhi seluruh tinggi frame vertikal (9:16), bukan cuma menumpuk di tengah/bawah.
${FILL_NO_TEXT}
${localeSceneNote(lang)}`;
}