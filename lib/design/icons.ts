/**
 * ICON REGISTRY — VERSI FINAL (emoji, BUKAN SVG vector)
 * --------------------------------------------------------
 * PERUBAHAN PENTING dari paket v1-v3 sebelumnya: ikon di sini adalah EMOJI
 * (string biasa), BUKAN komponen lucide-react/SVG.
 *
 * KENAPA DIUBAH (temuan audit di kevo-kirim.zip):
 * 1. renderTemplate.tsx (mesin Satori project ini) TIDAK PERNAH merender SVG
 *    vector arbitrer — cuma text, image, dan Decoration primitif (rect/circle/text).
 * 2. Project ini SUDAH PERNAH mencoba render ikon sungguhan (ikon sosmed di
 *    footer) dan SENGAJA MUNDUR ke "kotak warna + inisial" demi keandalan
 *    (lihat catatan lib/templates/brand.ts & footer socials). Memaksakan
 *    lucide-react ke Satori sekarang akan mengulang masalah yang sama.
 * 3. Emoji adalah TEXT biasa — Satori sudah pasti bisa render (dipakai di
 *    caption/hashtag di seluruh app). Nol kode render baru, nol risiko baru.
 *
 * AI tetap TIDAK bebas pilih emoji sembarang — dia cuma pilih dari daftar
 * kunci semantik di bawah (pola sama seperti sebelumnya: batasi pilihan).
 */

export const ICON_LIBRARY: Record<string, string> = {
  // --- fallback wajib ---
  "star": "⭐",
  "check-circle": "✅",
  "sparkles": "✨",
  "heart": "❤️",
  "shield-check": "🛡️",
  "thumbs-up": "👍",

  // --- fashion / olshop-fashion ---
  "shirt": "👕",
  "fabric-soft": "🧵",
  "color-variant": "🎨",

  // --- jualan-makanan ---
  "fresh-taste": "😋",
  "hot-fresh": "🔥",
  "natural": "🌿",
  "beverage": "🥤",
  "snack": "🍪",

  // --- laundry ---
  "clean-water": "💧",
  "machine-wash": "🧺",
  "fresh-scent": "🌬️",
  "spotless": "✨",

  // --- salon-barbershop ---
  "styling": "💇",
  "glow": "☀️",
  "premium-look": "💎",

  // --- bengkel-motor ---
  "service": "🔧",
  "spare-part": "⚙️",
  "performance": "🏍️",
  "safety": "🦺",

  // --- toko-bangunan ---
  "durable-build": "🔨",
  "precision": "📐",
  "worksite-ready": "👷",

  // --- umum e-commerce / olshop ---
  "fast-delivery": "🚚",
  "quality-checked": "📦",
  "everyday-use": "📅",
  "affordable": "💰",

  // --- pet-shop ---
  "pet-treat": "🦴",
  "pet-friendly": "🐾",
};

export const SAFE_FALLBACK_ICONS = ["star", "check-circle", "sparkles", "heart", "shield-check"] as const;

export const ICON_CATALOG_BY_INDUSTRY: Record<string, string[]> = {
  "olshop-fashion": ["shirt", "fabric-soft", "color-variant", "fast-delivery", "quality-checked", "affordable"],
  "jualan-makanan": ["fresh-taste", "hot-fresh", "natural", "beverage", "snack", "fast-delivery"],
  "laundry": ["clean-water", "machine-wash", "fresh-scent", "spotless", "fast-delivery", "affordable"],
  "salon-barbershop": ["styling", "glow", "premium-look", "everyday-use", "affordable"],
  "bengkel-motor": ["service", "spare-part", "performance", "safety", "quality-checked"],
  "toko-bangunan": ["durable-build", "precision", "worksite-ready", "quality-checked"],
  "pet-shop": ["pet-treat", "pet-friendly", "natural", "affordable"],
};

export function getAllowedIconKeys(industrySlug?: string): string[] {
  const industryIcons = (industrySlug && ICON_CATALOG_BY_INDUSTRY[industrySlug]) || [];
  return Array.from(new Set([...industryIcons, ...SAFE_FALLBACK_ICONS]));
}

/** Resolve nama kunci -> emoji asli, fallback ke ⭐ kalau AI sebut nama yang tidak ada. */
export function resolveIconEmoji(key: string): string {
  return ICON_LIBRARY[key] ?? "⭐";
}
