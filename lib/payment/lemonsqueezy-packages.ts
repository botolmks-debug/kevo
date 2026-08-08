// PENTING: Setelah bikin products di LS dashboard, GANTI variantId di bawah
// dengan angka asli dari LS Dashboard → Products → klik produk → tab Variants → Variant ID.
//
// Harga USD di sini HANYA untuk display di UI kamu — harga sesungguhnya
// ditentukan di LS dashboard. Pastikan cocok.

export type LemonSqueezyPackage = {
  id: string;
  tokens: number;
  priceUsd: number;
  variantId: string;
  label: string;
};

export const LEMONSQUEEZY_PACKAGES: LemonSqueezyPackage[] = [
  { id: "starter", tokens: 5,  priceUsd: 2,  variantId: "REPLACE_ME_1", label: "Starter" },
  { id: "regular", tokens: 10, priceUsd: 4,  variantId: "REPLACE_ME_2", label: "Regular" },
  { id: "value",   tokens: 20, priceUsd: 7,  variantId: "REPLACE_ME_3", label: "Value" },
  { id: "best",    tokens: 30, priceUsd: 10, variantId: "REPLACE_ME_4", label: "Best value" },
];

export function findPackageById(id: string): LemonSqueezyPackage | null {
  return LEMONSQUEEZY_PACKAGES.find((p) => p.id === id) ?? null;
}
