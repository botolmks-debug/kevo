import { outputLangDirective, type Lang } from "@/lib/ai/lang";
import type { BusinessProfile, ContentGoal } from "@/lib/onboarding/businessProfile";

export type CaptionContent = {
  templateName: string;
  /** Isi slot teks berlabel manusiawi, mis. { Headline: "..." }. */
  values: Record<string, string>;
};

const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  jualan: "jualan/penjualan",
  brand_awareness: "brand awareness",
  edukasi: "edukasi",
  loyalitas_pelanggan: "loyalitas pelanggan",
};

export function buildCaptionPrompt(profile: BusinessProfile, content: CaptionContent, lang?: Lang): string {
  const goals =
    profile.positioning.contentGoals.map((goal) => CONTENT_GOAL_LABELS[goal] ?? goal).join(", ") || "-";

  const contentLines =
    Object.entries(content.values)
      .filter(([, value]) => value.trim().length > 0)
      .map(([label, value]) => `- ${label}: ${value}`)
      .join("\n") || "(tidak ada isi tambahan)";

  return `${outputLangDirective(lang)}
Kamu adalah ahli komunikasi marketing. Tulis SATU caption media sosial untuk bisnis berikut (ikuti OUTPUT LANGUAGE di atas).

Profil bisnis:
- Nama: ${profile.business.name || "-"}
- Industri: ${profile.business.industry || "-"}
- Produk/layanan utama: ${profile.offering.mainProducts || "-"}
- Target pelanggan: ${profile.offering.targetCustomer || "-"}
- Pembeda/USP: ${profile.positioning.differentiator || "-"}
- Tujuan konten: ${goals}
- Nada/gaya brand: ${profile.positioning.tone || "netral"}
- CTA yang biasa dipakai: ${profile.positioning.cta || "-"}
- HAL YANG HARUS DIHINDARI (wajib dipatuhi, jangan singgung/klaim ini): ${profile.positioning.avoid || "-"}

Konten yang sedang dibuat (template: ${content.templateName}):
${contentLines}

Instruksi penulisan:
- Gaya soft-selling, satu ide utama, ringkas.
- Sertakan CTA yang relevan bila pas dengan konten.
- WAJIB variasikan kalimat pembuka setiap kali diminta — jangan selalu memakai pola pembuka yang sama seperti "Pernah nggak sih...".
- Patuhi nada brand dan hindari topik/klaim yang disebut di "hal yang harus dihindari" di atas.
- Boleh sertakan beberapa hashtag relevan di akhir.
- Keluarkan hanya teks caption, tanpa penjelasan tambahan atau tanda kutip pembungkus.`;
}
