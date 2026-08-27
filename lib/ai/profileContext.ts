/**
 * SUMBER TUNGGAL untuk merangkai data profil bisnis jadi teks prompt.
 * ==========================================================================
 * SEBELUM file ini ada: `profileBlock()` di-copy-paste 3x beda-beda (di
 * autoContentPrompt.ts, carouselPrompt.ts, captionPrompt.ts) — masing-masing
 * pegang subset field yang beda, jadi field baru (mis. priceRange) gampang
 * "lupa" ditambahin ke salah satu tempat. Sekarang SEMUA builder teks impor
 * dari sini. Field baru cukup ditambah SEKALI di sini, otomatis ikut ke
 * semua fitur (Buat Konten, Carousel, Generate Otomatis, Video Cerita).
 *
 * `sceneBusinessContext()` = versi RINGKAS 1-baris untuk prompt GAMBAR
 * (scenePrompt.ts) — dulu di-copy 8x di file itu dengan field berbeda-beda.
 * ==========================================================================
 */
import type { Lang } from "@/lib/ai/lang";
import type { BusinessProfile, ContentGoal } from "@/lib/onboarding/businessProfile";

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

const CONTENT_GOAL_LABELS_ID: Record<ContentGoal, string> = {
  jualan: "jualan/penjualan",
  brand_awareness: "brand awareness",
  edukasi: "edukasi",
  loyalitas_pelanggan: "loyalitas pelanggan",
};
const CONTENT_GOAL_LABELS_EN: Record<ContentGoal, string> = {
  jualan: "sales/conversion",
  brand_awareness: "brand awareness",
  edukasi: "education",
  loyalitas_pelanggan: "customer loyalty",
};

export function customerTypeLabel(profile: BusinessProfile, lang?: Lang): string {
  const t = profile.offering.customerTypes ?? [];
  const hasB2c = t.includes("b2c");
  const hasB2b = t.includes("b2b");
  if (isEn(lang)) {
    if (hasB2c && hasB2b) return "Both direct consumers (B2C) and other businesses (B2B)";
    if (hasB2b) return "Other businesses (B2B) — buying for resale or business operations, NOT personal use";
    if (hasB2c) return "Direct consumers (B2C) — buying for personal/own use";
    return "-";
  }
  if (hasB2c && hasB2b) return "Konsumen langsung (B2C) dan sesama pebisnis (B2B) sekaligus";
  if (hasB2b) return "Sesama pebisnis (B2B) — beli buat dijual lagi/operasional usaha, BUKAN konsumsi pribadi";
  if (hasB2c) return "Konsumen langsung (B2C) — beli buat dipakai/dikonsumsi sendiri";
  return "-";
}

/**
 * Rangkuman lengkap profil bisnis, dipakai builder TEKS (caption/judul).
 * Sekarang termasuk `priceRange` (dulu dikumpulkan di onboarding tapi TIDAK
 * PERNAH dipakai AI) — dikasih ATURAN GENERIK biar AI sendiri yang kalibrasi
 * nada sesuai konteks industrinya (bukan keyword-matching kaku yang gampang
 * salah untuk teks bebas seperti "Rp15rb-50rb" vs "mulai 2 juta").
 */
export function buildProfileBlock(profile: BusinessProfile, lang?: Lang): string {
  const labels = isEn(lang) ? CONTENT_GOAL_LABELS_EN : CONTENT_GOAL_LABELS_ID;
  const goals = profile.positioning.contentGoals.map((goal) => labels[goal] ?? goal).join(", ") || "-";
  const custTypes = profile.offering.customerTypes ?? [];
  const hasB2c = custTypes.includes("b2c");
  const hasB2b = custTypes.includes("b2b");
  const custTypeGuard = !custTypes.length
    ? ""
    : isEn(lang)
      ? hasB2b && hasB2c
        ? "\nCUSTOMER-TYPE RULE: this business sells to BOTH individual consumers and other businesses — keep framing broad enough to fit either, or pick whichever fits the specific product/photo at hand without contradicting the other."
        : hasB2b
          ? "\nCUSTOMER-TYPE RULE (hard): this business sells B2B — the reader is a business owner/buyer restocking or sourcing for their OWN business, not an end consumer. NEVER use personal-consumer framing (personal payday/\"gajian\", self-treat, personal enjoyment). Frame around business needs: restocking, inventory, order quantity, margin, reliability for their operations."
          : "\nCUSTOMER-TYPE RULE (hard): this business sells B2C — the reader is an individual end consumer. Frame around personal use/enjoyment, not wholesale/business-operations language (don't talk about \"restocking inventory\" or \"margin\")."
      : hasB2b && hasB2c
        ? "\nATURAN TIPE PELANGGAN: bisnis ini jual ke KEDUANYA (konsumen langsung & sesama pebisnis) — bingkai secukupnya biar cocok ke dua-duanya, atau pilih salah satu yang paling pas dengan produk/foto yang sedang dibuat tanpa bertentangan sama yang lain."
        : hasB2b
          ? "\nATURAN TIPE PELANGGAN (keras): bisnis ini jual B2B — pembacanya adalah pemilik/pembeli usaha yang restock atau cari suplai buat usahanya SENDIRI, bukan konsumen akhir. JANGAN pakai framing konsumen pribadi (gajian pribadi, self-reward, dinikmati sendiri). Bingkai seputar kebutuhan usaha: restock, stok, jumlah order, margin, keandalan buat operasional mereka."
          : "\nATURAN TIPE PELANGGAN (keras): bisnis ini jual B2C — pembacanya konsumen akhir perorangan. Bingkai seputar pemakaian/kenikmatan pribadi, jangan pakai bahasa grosir/operasional bisnis (jangan sebut \"restock stok\" atau \"margin\").";

  const priceRange = profile.offering.priceRange?.trim();
  const priceLineEn = priceRange
    ? `\n- Price range (INTERNAL REFERENCE ONLY, never state the actual number/range in the output): ${priceRange}\nPRICE-CALIBRATION RULE: judge from this price range whether the positioning is premium/upscale or affordable/value — for premium, use refined, confident language and NEVER anything that sounds "cheap"; for affordable, lean into value-for-money/practical language without sounding low-quality. This is tone guidance only — do NOT print the price figure/range itself anywhere in the title or caption unless the user's own product description explicitly asked for a price to be shown.`
    : "";
  const priceLineId = priceRange
    ? `\n- Rentang harga (REFERENSI INTERNAL SAJA, JANGAN sebutkan angka/rentangnya di output): ${priceRange}\nATURAN KALIBRASI HARGA: nilai sendiri dari rentang harga ini apakah posisinya premium/kelas atas atau terjangkau/hemat — kalau premium, pakai bahasa halus & percaya diri, JANGAN sampai terkesan "murahan"; kalau terjangkau, boleh angkat sisi hemat/worth-it tanpa terkesan kualitas rendah. Ini cuma panduan NADA — JANGAN cetak angka/rentang harganya di judul atau caption, kecuali deskripsi produk dari user sendiri memang minta harga ditampilkan.`
    : "";

  const age = profile.business.age?.trim();
  const ageLineEn = age
    ? `\n- Business age (INTERNAL REFERENCE ONLY, never state the number/year in the output): ${age}\nAGE-CALIBRATION RULE: use this only to calibrate FEELING — a longer-running business may lean into an established/trusted/experienced feeling, a newer business may lean into fresh/exciting/up-and-coming energy. Do NOT literally state the age or founding year anywhere ("X years running", "since 20XX") unless the user's own product description explicitly asked for it.`
    : "";
  const ageLineId = age
    ? `\n- Usia usaha (REFERENSI INTERNAL SAJA, JANGAN sebutkan angka/tahunnya di output): ${age}\nATURAN KALIBRASI USIA: pakai ini HANYA untuk kalibrasi RASA — usaha yang sudah lama boleh terasa lebih established/berpengalaman/dipercaya, usaha yang baru boleh terasa lebih fresh/bersemangat/baru-naik-daun. JANGAN sebutkan usianya atau tahun berdirinya secara harfiah di mana pun ("sudah X tahun", "sejak tahun Y"), kecuali deskripsi produk dari user sendiri memang minta itu ditampilkan.`
    : "";

  if (isEn(lang)) {
    return `Business profile (MUST be woven into the content as its foundation — don't be generic):
- Name: ${profile.business.name || "-"}
- Industry: ${profile.business.industry || "-"}
- Location: ${profile.business.location || "-"}
- Main products/services: ${profile.offering.mainProducts || "-"}
- Target customer: ${profile.offering.targetCustomer || "-"}
- Customer type: ${customerTypeLabel(profile, lang)}
- Customer problem being solved: ${profile.offering.customerProblem || "-"}
- Differentiator/USP: ${profile.positioning.differentiator || "-"}
- Content goals: ${goals}
- Brand voice/tone: ${profile.positioning.tone || "neutral"}
- CTA: ${profile.positioning.cta || "-"}
- Brand story: ${profile.story || "-"}
- AVOID: ${profile.positioning.avoid || "-"}${priceLineEn}${ageLineEn}${custTypeGuard}`;
  }

  return `Profil bisnis (WAJIB dirangkai jadi dasar konten — jangan generik):
- Nama: ${profile.business.name || "-"}
- Industri: ${profile.business.industry || "-"}
- Lokasi: ${profile.business.location || "-"}
- Produk/layanan utama: ${profile.offering.mainProducts || "-"}
- Target pelanggan: ${profile.offering.targetCustomer || "-"}
- Tipe pelanggan: ${customerTypeLabel(profile, lang)}
- Masalah pelanggan yang diselesaikan: ${profile.offering.customerProblem || "-"}
- Pembeda/USP: ${profile.positioning.differentiator || "-"}
- Tujuan konten: ${goals}
- Nada/gaya brand: ${profile.positioning.tone || "netral"}
- CTA: ${profile.positioning.cta || "-"}
- Cerita brand: ${profile.story || "-"}
- HINDARI: ${profile.positioning.avoid || "-"}${priceLineId}${ageLineId}${custTypeGuard}`;
}

/**
 * Versi RINGKAS 1-baris untuk prompt GAMBAR (scenePrompt.ts). Beda dari
 * buildProfileBlock: sengaja pendek (prompt gambar tidak butuh detail
 * sebanyak prompt teks) tapi sekarang ikut bawa priceRange supaya gaya VISUAL
 * (kemewahan set/prop/lighting) ikut kalibrasi ke posisi harga — dulu foto
 * premium & foto hemat diperlakukan sama persis.
 */
export function sceneBusinessContext(profile: BusinessProfile, lang?: Lang): string {
  const priceRange = profile.offering.priceRange?.trim();
  const priceNote = priceRange
    ? isEn(lang)
      ? `, Price positioning: ${priceRange} (let this guide how upscale vs. modest the setting/props/lighting should feel)`
      : `, Posisi harga: ${priceRange} (jadikan ini acuan seberapa mewah vs sederhana suasana/prop/pencahayaan)`
    : "";
  return isEn(lang)
    ? `Business context: Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Target customers ${profile.offering.targetCustomer || "-"}${priceNote}.`
    : `Konteks bisnis: Industri ${profile.business.industry || "-"}, Lokasi ${profile.business.location || "-"}, Target pelanggan ${profile.offering.targetCustomer || "-"}${priceNote}.`;
}
