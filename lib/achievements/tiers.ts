// lib/achievements/tiers.ts
// Definisi peringkat achievement Keposting.
// Hitungan = TOTAL HARI AKTIF (hari kalender yang punya minimal 1 generate),
// tidak harus berturut-turut.

export type TierId =
  | "starter"
  | "creator"
  | "builder"
  | "pro"
  | "master"
  | "legend";

export type Tier = {
  id: TierId;
  label: string;
  days: number; // total hari aktif yang dibutuhkan
  rewardTokens: number; // hadiah token sekali saat tercapai
  color: string; // warna utama badge
};

// Urut dari terendah ke tertinggi.
export const TIERS: Tier[] = [
  { id: "starter", label: "Starter", days: 30, rewardTokens: 0, color: "#94a3b8" },
  { id: "creator", label: "Creator", days: 60, rewardTokens: 3, color: "#14b8a6" },
  { id: "builder", label: "Builder", days: 100, rewardTokens: 5, color: "#f97316" },
  { id: "pro", label: "Pro", days: 150, rewardTokens: 8, color: "#6366f1" },
  { id: "master", label: "Master", days: 300, rewardTokens: 10, color: "#eab308" },
  { id: "legend", label: "Legend", days: 360, rewardTokens: 12, color: "#e11d48" },
];

/** Peringkat tertinggi yang sudah dicapai untuk total hari aktif tertentu (null kalau < 30 hari). */
export function currentTier(activeDays: number): Tier | null {
  let hasil: Tier | null = null;
  for (const t of TIERS) {
    if (activeDays >= t.days) hasil = t;
  }
  return hasil;
}

/** Peringkat berikutnya yang belum dicapai (null kalau sudah Legend). */
export function nextTier(activeDays: number): Tier | null {
  for (const t of TIERS) {
    if (activeDays < t.days) return t;
  }
  return null;
}

/** Semua peringkat yang sudah dicapai (untuk pemberian hadiah idempoten). */
export function achievedTiers(activeDays: number): Tier[] {
  return TIERS.filter((t) => activeDays >= t.days);
}
