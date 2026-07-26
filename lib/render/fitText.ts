// Perkiraan kasar rasio lebar-rata-rata-karakter terhadap fontSize untuk
// font Inter. INI BUKAN ukuran presisi (tidak mengukur glyph sungguhan) —
// jaring pengaman aktual anti-overflow ada di satori `lineClamp` saat render
// (lihat lib/render/renderTemplate.tsx), fungsi ini hanya estimasi untuk
// keperluan testing & preview cepat tanpa memanggil satori.
const AVG_CHAR_WIDTH_FACTOR = 0.55;
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
