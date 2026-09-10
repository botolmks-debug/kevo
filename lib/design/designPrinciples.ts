/**
 * DESIGN PRINCIPLES — VERSI FINAL
 * ---------------------------------
 * Sama prinsipnya dengan paket v3 (rule of thirds, type scale, golden ratio,
 * 60-30-10, kontras WCAG), tapi outputnya disesuaikan supaya PAS dengan tipe
 * asli project (lib/templates/types.ts): posisi jadi rumus persen -> px per
 * rasio (bukan CSS %), ukuran font jadi pasangan {maxFontSize,minFontSize}
 * (karena TextSlot butuh RENTANG untuk auto-shrink, bukan 1 angka tetap).
 */

// ============================================================
// 1. RULE OF THIRDS — anchor dalam PERSEN (dikonversi ke px saat build template)
// ============================================================

export interface Anchor {
  id: string;
  xPct: number; // 0-100, posisi KIRI kotak teks
  yPct: number; // 0-100, posisi ATAS kotak teks
  description: string;
}

export const HEADLINE_ANCHORS: Anchor[] = [
  { id: "bottom-band-safe", xPct: 7, yPct: 68, description: "pita bawah, standar headline+subheadline" },
  { id: "top-band-safe", xPct: 7, yPct: 8, description: "pita atas, alternatif kalau bawah penuh produk" },
  { id: "center-band", xPct: 7, yPct: 42, description: "pita tengah, dipakai untuk foto sangat penuh + scrim kuat" },
];

export const BADGE_ANCHORS: Anchor[] = [
  { id: "badge-bottom-left", xPct: 7, yPct: 90, description: "kiri bawah, badge disusun mendatar ke kanan" },
  { id: "badge-mid-left", xPct: 7, yPct: 78, description: "kiri tengah-bawah, badge disusun mendatar ke kanan" },
  { id: "badge-bottom-right-col", xPct: 68, yPct: 62, description: "kanan, badge disusun menurun (kolom)" },
  { id: "badge-top-right-col", xPct: 68, yPct: 10, description: "kanan atas, badge disusun menurun (kolom) — cocok kalau bawah penuh produk" },
];

// ============================================================
// 2. TYPE SCALE — rasio 1.25 (Major Third), dipetakan ke {max,min} fontSize
// ============================================================

const TYPE_SCALE_RATIO = 1.25;

export interface FontSizeRange {
  maxFontSize: number;
  minFontSize: number;
}

export interface TypeScale {
  badge: FontSizeRange;
  subheadline: FontSizeRange;
  headline: FontSizeRange;
}

function range(max: number): FontSizeRange {
  return { maxFontSize: max, minFontSize: Math.round(max * 0.55) };
}

export const TYPE_SCALE_PRESETS: Record<"compact" | "standard" | "bold", TypeScale> = {
  compact: { badge: range(28), subheadline: range(36), headline: range(64) },
  standard: { badge: range(32), subheadline: range(42), headline: range(78) },
  bold: { badge: range(38), subheadline: range(50), headline: range(96) },
};
void TYPE_SCALE_RATIO; // dipakai konseptual untuk turunan angka di atas, disimpan sbg dokumentasi rasio

// ============================================================
// 3. GOLDEN RATIO — tinggi scrim (persen), scaling dari fullnessScore
// ============================================================

export const GOLDEN_RATIO = 1.618;

export function computeScrimHeightPct(fullnessScore: number): number {
  const base = 100 / GOLDEN_RATIO / GOLDEN_RATIO; // ~38.2%
  const extra = fullnessScore * 15;
  return Math.min(65, Math.round(base + extra));
}

// ============================================================
// 4. KONTRAS WCAG — dipakai untuk pilih warna teks (hitam/putih) yang pasti kebaca
// ============================================================

function relativeLuminanceOf(hex: string): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(hex.slice(1, 3), 16));
  const g = toLinear(parseInt(hex.slice(3, 5), 16));
  const b = toLinear(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminanceOf(hexA) + 0.05;
  const lumB = relativeLuminanceOf(hexB) + 0.05;
  return lumA > lumB ? lumA / lumB : lumB / lumA;
}

/** Scrim di project ini SELALU gelap-ke-transparan (lihat polos.ts) — jadi teks di atasnya nyaris selalu putih. Fungsi ini validasi eksplisit, bukan tebakan. */
export function textColorForScrim(scrimBrightness: "dark" | "light"): string {
  const white = "#FFFFFF";
  const black = "#1A1A1A";
  const bg = scrimBrightness === "dark" ? "#000000" : "#FFFFFF";
  return contrastRatio(white, bg) >= contrastRatio(black, bg) ? white : black;
}

// ============================================================
// RINGKASAN UNTUK PROMPT AI
// ============================================================

export function buildDesignPrinciplesBrief(): string {
  return `PRINSIP DESAIN WAJIB DIPAKAI (kamu ahli desain, memilih dari opsi baku, bukan menebak):
1. Posisi headline/subheadline WAJIB pilih salah satu anchorId dari daftar HEADLINE ANCHOR yang diberikan.
2. Posisi badge WAJIB pilih salah satu anchorId dari daftar BADGE ANCHOR yang diberikan.
3. Skala ukuran huruf: pilih SATU dari "compact"|"standard"|"bold" — jangan minta ukuran custom.
4. scrimBrightness: "dark" (scrim gelap di belakang teks, teks jadi putih) atau "light" (scrim terang, teks jadi gelap) — warna teks DIHITUNG OTOMATIS dari pilihan ini, bukan tugasmu menentukan hex.`;
}
