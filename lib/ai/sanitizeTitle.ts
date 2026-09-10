/**
 * SANITIZE TITLE — jaring pengaman terakhir untuk judul (onImageText).
 * ---------------------------------------------------------------------
 * Root cause asli SUDAH diperbaiki di lib/ai/autoContentPrompt.ts (prompt
 * dulu literally menyarankan AI pakai "—" sebagai pengganti titik dua).
 * File ini tambahan jaring pengaman: kalau AI tetap kadang menyelipkan
 * "--", "—", atau "–" (kebiasaan lama dari training data), tanda itu
 * dirapikan otomatis SEBELUM sampai ke user — bukan mengandalkan prompt saja.
 *
 * Dipakai di titik akhir tiap generate judul:
 * - app/api/generate-auto/titles/route.ts (3 tempat return titles)
 * - app/api/generate-auto/route.ts (setelah content.onImageText final)
 * - lib/demo/generate.ts (setelah onImageText di-extract)
 */

/**
 * Ganti "--" (double hyphen) dan em/en dash ("—"/"–") jadi koma atau spasi,
 * tergantung posisinya, supaya kalimat tetap mengalir alami (bukan cuma
 * dihapus mentah yang bisa bikin dua kata nempel).
 */
export function sanitizeTitle(raw: string): string {
  if (!raw) return raw;

  let cleaned = raw
    // "kata--kata" atau "kata — kata" -> "kata, kata" (paling umum: dash sebagai jeda/pemisah)
    .replace(/\s*--\s*/g, ", ")
    .replace(/\s*[—–]\s*/g, ", ")
    // rapikan kalau muncul koma dobel akibat penggantian di atas
    .replace(/,\s*,/g, ",")
    // rapikan spasi ganda
    .replace(/\s{2,}/g, " ")
    .trim();

  // Kalau hasil penggantian bikin koma nempel di akhir kalimat (mis. dash di ujung), buang.
  cleaned = cleaned.replace(/,\s*$/g, "").trim();

  return cleaned;
}

/** Helper untuk array judul (dipakai di endpoint /titles yang balikin 5 kandidat sekaligus). */
export function sanitizeTitles(titles: string[]): string[] {
  return titles.map(sanitizeTitle);
}
