// lib/payment/packages.ts
// Daftar paket top-up token Keposting.
// PENTING: kalau ubah harga di sini, samakan juga di components/PricingSection.tsx
// dan halaman /topup + FAQ landing page biar konsisten saat direview Midtrans.

export type TopupPackage = {
  id: string;
  label: string;
  tokens: number;
  priceIdr: number; // dalam Rupiah (bukan sen)
  pricePerToken: number;
  highlight?: boolean;
  description?: string;
};

export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    id: "pkg_10",
    label: "Paket Mulai",
    tokens: 10,
    priceIdr: 50_000,
    pricePerToken: 5_000,
    description: "5 konten siap posting",
  },
  {
    id: "pkg_30",
    label: "Paket Rutin",
    tokens: 30,
    priceIdr: 135_000,
    pricePerToken: 4_500,
    highlight: true,
    description: "Konten sebulan (1 post/hari). Hemat 10%.",
  },
  {
    id: "pkg_60",
    label: "Paket Serius",
    tokens: 60,
    priceIdr: 240_000,
    pricePerToken: 4_000,
    description: "2 bulan konten harian. Hemat 20%.",
  },
];

/** Ambil paket berdasarkan id. Return null kalau tidak ketemu. */
export function getPackageById(id: string): TopupPackage | null {
  return TOPUP_PACKAGES.find((p) => p.id === id) ?? null;
}

/** Format harga ke "Rp 50.000". */
export function formatIdr(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}
