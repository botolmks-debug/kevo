export type ImageType = "logo" | "produk" | "wajah" | "suasana" | "lain";
export type ImageUsage = "apa_adanya" | "olah_ai";

export type ImageCategoryDef = { category: string; type: ImageType; label: string };

// Daftar kategori tetap (spec-08 mengizinkan ini cukup di kode, bukan tabel
// terpisah). Tambahkan entri baru di sini kalau perlu kategori lain.
export const IMAGE_CATEGORIES: ImageCategoryDef[] = [
  { category: "Logo", type: "logo", label: "Logo" },
  { category: "Produk", type: "produk", label: "Produk" },
  { category: "Wajah/Orang", type: "wajah", label: "Wajah / Orang" },
  { category: "Suasana/Fasilitas", type: "suasana", label: "Suasana / Fasilitas" },
  { category: "Lain-lain", type: "lain", label: "Lain-lain" },
];

export const DEFAULT_IMAGE_CATEGORY = IMAGE_CATEGORIES[0].category;

export function categoryToType(category: string): ImageType {
  return IMAGE_CATEGORIES.find((c) => c.category === category)?.type ?? "lain";
}
