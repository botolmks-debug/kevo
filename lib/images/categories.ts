export type ImageType = "logo" | "produk" | "skincare" | "wajah" | "suasana" | "software" | "lain";
export type ImageUsage = "apa_adanya" | "olah_ai";

export type ImageCategoryDef = { category: string; type: ImageType; label: string };

// Daftar kategori tetap (spec-08 mengizinkan ini cukup di kode, bukan tabel
// terpisah). Tambahkan entri baru di sini kalau perlu kategori lain.
//
// "Logo" sengaja tidak ada di sini: logo bisnis sekarang punya slot khusus
// (lihat lib/onboarding/businessProfile.ts `logo`, upload lewat
// /api/business-logo), bukan lagi salah satu kategori Database Gambar.
export const IMAGE_CATEGORIES: ImageCategoryDef[] = [
  { category: "Produk", type: "produk", label: "Produk" },
  { category: "Kecantikan/Skincare", type: "skincare", label: "Kecantikan / Skincare" },
  { category: "Software/Website", type: "software", label: "Software / Website" },
  { category: "Wajah/Orang", type: "wajah", label: "Wajah / Orang" },
  { category: "Suasana/Fasilitas", type: "suasana", label: "Suasana / Fasilitas" },
  { category: "Lain-lain", type: "lain", label: "Lain-lain" },
];

export const DEFAULT_IMAGE_CATEGORY = IMAGE_CATEGORIES[0].category;

export function categoryToType(category: string): ImageType {
  return IMAGE_CATEGORIES.find((c) => c.category === category)?.type ?? "lain";
}
