/**
 * Daftar paket untuk UI halaman /topup (client-safe — tanpa crypto/env server).
 * WAJIB sinkron dengan: MIDTRANS_PACKAGES di lib/payment/midtrans.ts DAN
 * PricingSection.tsx di landing page. Validasi harga sesungguhnya di server.
 */
export type MidtransPackageView = {
  id: string;
  tokens: number;
  priceIdr: number;
  label: string;
  perKonten: number;
  highlight: boolean;
  benefits: string[];
};

export const MIDTRANS_PACKAGES: MidtransPackageView[] = [
  {
    id: "mulai",
    tokens: 10,
    priceIdr: 50000,
    label: "Paket Mulai",
    perKonten: 5000,
    highlight: false,
    benefits: ["5 konten siap posting", "Semua fitur AI", "Token tidak hangus"],
  },
  {
    id: "rutin",
    tokens: 30,
    priceIdr: 135000,
    label: "Paket Rutin",
    perKonten: 4500,
    highlight: true,
    benefits: ["Konten sebulan (1 post/hari)", "Hemat 10% dari Paket Mulai", "Semua fitur AI", "Token tidak hangus"],
  },
  {
    id: "serius",
    tokens: 60,
    priceIdr: 240000,
    label: "Paket Serius",
    perKonten: 4000,
    highlight: false,
    benefits: ["2 bulan konten harian", "Hemat 20% dari Paket Mulai", "Semua fitur AI", "Token tidak hangus"],
  },
];
