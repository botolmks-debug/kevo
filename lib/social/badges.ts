// Badge sertifikasi produk Indonesia (Halal, SNI, BPOM) — dilampirkan pada
// konten lewat canvas editor, pola sama dengan delivery badges tapi TANPA
// heading ("Available on") karena badge sertifikasi berdiri sendiri.
// PNG transparan di public/badges/<id>.png — tinggi seragam, lebar mengikuti
// rasio asli tiap logo (aspect = lebar/tinggi).
export type CertBadge = { id: string; label: string; aspect: number };

export const CERT_BADGES: CertBadge[] = [
  { id: "halal", label: "Halal Indonesia", aspect: 282 / 400 },
  { id: "sni", label: "SNI", aspect: 474 / 400 },
  { id: "bpom", label: "BPOM", aspect: 435 / 400 },
];

export const CERT_BADGE_MAP: Record<string, CertBadge> = Object.fromEntries(
  CERT_BADGES.map((b) => [b.id, b]),
);

// Tinggi dasar badge di kanvas 1080 (sebelum slider ukuran).
export const CERT_BADGE_H = 96;
export const CERT_BADGE_GAP = 16;
