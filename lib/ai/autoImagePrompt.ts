// Berlaku untuk SEMUA jenis: gambar penuh edge-to-edge & tanpa teks/branding.
const FILL_NO_TEXT =
  "Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos/rata, tanpa bidang putih atau abu-abu kosong, tanpa border/bingkai. " +
  "Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau BRANDING apa pun di dalam gambar - termasuk pada objek seperti gelas, baju, papan, atau dinding. Semua objek harus bersih tanpa teks.";

// HANYA untuk template yang punya scrim gelap di bawah (General/Produk).
// Interaksi TIDAK memakai ini karena scrim-nya sudah dihapus - kalau tetap
// dipakai, bagian bawah jadi bidang kosong/abu-abu yang kelihatan.
const BOTTOM_CALM_FOR_TEXT =
  "Bagian bawah sekitar sepertiga tinggi gambar akan ditutup lapisan gelap tipis berisi teks - buat area itu sedikit lebih tenang supaya teks terbaca, TAPI tetap berisi gambar/detail, JANGAN dikosongkan menjadi bidang polos.";

export function buildGeneralImagePrompt(scene: string): string {
  return `Foto editorial realistis berkualitas tinggi. Pencahayaan: INDOOR hangat dan lembut (warm tungsten/ambient), hindari cahaya harsh/terlalu terang - suasana cozy dan premium. Depth of field lembut, terasa nyata dan profesional - BUKAN ilustrasi atau kartun.
Adegan: ${scene}
Buat suasana dan lingkungan terasa autentik dan cocok dengan target pasar (bukan generik/stok).
${FILL_NO_TEXT} ${BOTTOM_CALM_FOR_TEXT}`;
}

export function buildInteraksiImagePrompt(scene: string): string {
  return `Gambar bertema INTERAKSI/kehangatan komunitas antara bisnis dan pelanggannya. Boleh bergaya ilustrasi ceria, kartun modern, animasi, atau semi-realistis. Warna cerah, bentuk ramah, terasa hidup dan mengundang.
Adegan: ${scene}
PENTING: JANGAN menambahkan teks, huruf, angka, logo, atau branding apa pun pada objek dalam gambar (gelas, baju, tas, dinding, papan, dll). Semua objek harus BERSIH tanpa tulisan. JANGAN membuat logo atau inisial brand. Isi seluruh bingkai dengan adegan interaksi - JANGAN sisakan area bawah kosong/polos.
${FILL_NO_TEXT}`;
}