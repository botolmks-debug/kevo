import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

// Bangun prompt logo dari data onboarding yang SUDAH tersimpan (BusinessProfile
// nested: business/offering/positioning) — tidak butuh input baru dari user.
export function buildLogoPrompt(profile: BusinessProfile): string {
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
Buat logo bisnis profesional untuk usaha bernama "${name}"${industry}.
${differentiator}${tone}${product}

ATURAN WAJIB:
- Gaya: logo modern, simpel, flat/vector style. BUKAN foto realistis, BUKAN mockup 3D, BUKAN ilustrasi rumit.
- Kombinasi ikon simbolis singkat + nama usaha sebagai wordmark, keduanya harus jelas terbaca.
- Nama usaha HARUS dieja PERSIS "${name}" tanpa typo, tanpa huruf tambahan, tanpa kata lain.
- Maksimal 2 warna utama + 1 warna aksen, kontras tinggi agar tetap terbaca di ukuran kecil (favicon/avatar).
- Komposisi TERPUSAT dengan banyak ruang kosong di sekeliling logo (untuk keperluan crop nanti).
- Latar belakang WAJIB warna magenta solid #FF00FF, rata, tanpa gradasi, tanpa tekstur, tanpa bayangan jatuh ke latar.
- JANGAN sertakan watermark, JANGAN sertakan teks tambahan selain nama usaha, JANGAN sertakan bingkai/frame/mockup.
`.trim();
}
