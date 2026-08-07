// Perkiraan kasar rasio lebar-rata-rata-karakter terhadap fontSize untuk
// font Inter. INI BUKAN ukuran presisi (tidak mengukur glyph sungguhan) —
// jaring pengaman aktual anti-overflow ada di satori `lineClamp` saat render
// (lihat lib/render/renderTemplate.tsx), fungsi ini hanya estimasi untuk
// keperluan testing & preview cepat tanpa memanggil satori.
const AVG_CHAR_WIDTH_FACTOR = 0.62;
const ELLIPSIS = "…";

export type FitTextOptions = {
  boxWidth: number;
  fontSize: number;
  maxLines: number;
};

export function fitTextForDisplay(text: string, opts: FitTextOptions): string {
  const { boxWidth, fontSize, maxLines } = opts;

  const charsPerLine = Math.max(1, Math.floor(boxWidth / (fontSize * AVG_CHAR_WIDTH_FACTOR)));
  const budget = charsPerLine * Math.max(1, maxLines);

  if (text.length <= budget) {
    return text;
  }

  const truncateAt = Math.max(0, budget - ELLIPSIS.length);
  return text.slice(0, truncateAt).trimEnd() + ELLIPSIS;
}

/**
 * Cari ukuran font terbesar (antara minFontSize..maxFontSize) yang membuat teks
 * muat dalam maxLines — estimasi kasar pakai AVG_CHAR_WIDTH_FACTOR. Dipakai agar
 * judul panjang MENGECIL (bukan dipotong "…"). Jaring pengaman terakhir tetap
 * lineClamp satori di ukuran minimum.
 */
export function fitFontSize(
  text: string,
  opts: { boxWidth: number; maxFontSize: number; minFontSize: number; maxLines?: number; boxHeight?: number; lineHeight?: number },
): number {
  const { boxWidth, maxFontSize, minFontSize, maxLines, boxHeight, lineHeight = 1 } = opts;
  const len = text.trim().length;
  if (len === 0) return maxFontSize;
  const lo = Math.min(minFontSize, maxFontSize);
  for (let size = maxFontSize; size > lo; size -= 2) {
    const charsPerLine = Math.max(1, Math.floor(boxWidth / (size * AVG_CHAR_WIDTH_FACTOR)));
    // Batas baris = berapa banyak baris yang MUAT di tinggi kotak (kalau boxHeight
    // diberikan) — jadi tidak ada batas baris arbitrer; kalau tidak, pakai maxLines.
    const linesAllowed = boxHeight
      ? Math.max(1, Math.floor(boxHeight / (size * lineHeight)))
      : Math.max(1, maxLines ?? 2);
    if (len <= charsPerLine * linesAllowed) return size;
  }
  return lo;
}

/** Estimasi jumlah baris yang dibutuhkan teks pada fontSize tertentu (kasar). */
export function estimateLines(text: string, boxWidth: number, fontSize: number): number {
  const cpl = Math.max(1, Math.floor(boxWidth / (fontSize * AVG_CHAR_WIDTH_FACTOR)));
  return Math.max(1, Math.ceil(text.trim().length / cpl));
}
