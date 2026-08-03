import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

/**
 * Prompt untuk menaruh PRODUK ASLI (gambar input) di tangan seseorang, di
 * lingkungan sesuai target pasar. Titik kritis = menjaga label/desain produk
 * TIDAK berubah (kelemahan utama image gen). Wajah menghadap kamera supaya
 * gambar ini bisa dipakai untuk lip-sync (image -> video) nanti.
 */
export function buildHoldingProductPrompt(
  profile: BusinessProfile,
  gender: "pria" | "wanita",
  productDescription?: string,
): string {
  const person = gender === "pria" ? "seorang pria" : "seorang wanita";
  const target = profile.offering.targetCustomer || profile.business.industry || "pelanggan umum";
  const context = [profile.business.industry, profile.business.location].filter(Boolean).join(", ");

  return `Foto realistis berkualitas tinggi (BUKAN ilustrasi atau kartun).
Buat foto ${person} yang cocok mewakili pelanggan bisnis ini, sedang MEMEGANG dan menunjukkan produk pada gambar input, menghadap kamera dengan ramah.

ATURAN PRODUK (PALING PENTING):
- Produk pada gambar input WAJIB dipertahankan PERSIS: bentuk, warna, label, SEMUA tulisan/teks, dan desain kemasan TIDAK BOLEH diubah, diganti, dikaburkan, atau ditulis ulang. Perlakukan produk sebagai objek nyata yang ditempel (composite), BUKAN digambar ulang.
- JANGAN menambah atau mengurangi teks pada produk. JANGAN mengarang merek atau label lain.${
    productDescription ? `\n- Konteks produk: ${productDescription}` : ""
  }

ORANG:
- ${person}, ekspresi ramah & percaya diri, MENGHADAP KAMERA, wajah terlihat jelas dari depan, komposisi setengah badan (dada ke atas).
- Memegang produk di depan dada dengan wajar; tangan TIDAK menutupi label/merek utama produk.

LINGKUNGAN (sesuai target pasar):
- Latar & suasana yang pas untuk target pelanggan: ${target}${context ? ` (konteks bisnis: ${context})` : ""}. Pencahayaan alami, terasa autentik dan premium, bukan studio kosong.

TEKNIS:
- Isi PENUH bingkai potret 9:16 dari atas sampai bawah, tanpa area kosong, tanpa bar/pias hitam-putih.
- Fokus tajam pada orang dan produk; produk tetap jadi bintang.
- JANGAN menambahkan tulisan, angka, logo, atau watermark apa pun ke dalam gambar SELAIN yang sudah ada pada produk.`;
}
