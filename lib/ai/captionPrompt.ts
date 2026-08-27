import { outputLangDirective, type Lang } from "@/lib/ai/lang";
import { qualityRules } from "@/lib/ai/autoContentPrompt";
import { buildProfileBlock } from "@/lib/ai/profileContext";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export type CaptionContent = {
  templateName: string;
  /** Isi slot teks berlabel manusiawi, mis. { Headline: "..." }. */
  values: Record<string, string>;
};

export function buildCaptionPrompt(profile: BusinessProfile, content: CaptionContent, lang?: Lang): string {
  const contentLines =
    Object.entries(content.values)
      .filter(([, value]) => value.trim().length > 0)
      .map(([label, value]) => `- ${label}: ${value}`)
      .join("\n") || "(tidak ada isi tambahan)";

  const lines = [
    `${outputLangDirective(lang)}`,
    `Kamu adalah pemilik bisnis yang lagi nulis caption Instagram sendiri untuk bisnisnya — bukan agensi iklan. Tulis SATU caption media sosial untuk bisnis berikut (ikuti OUTPUT LANGUAGE di atas).`,
    ``,
    // profileBlock terpusat (lib/ai/profileContext.ts) — sekarang ikut bawa
    // priceRange/cerita brand/tipe pelanggan yang DULU tidak pernah nyampe
    // ke fitur "Buat Konten" manual ini (cuma ada di Generate Otomatis).
    buildProfileBlock(profile, lang),
    ``,
    `Konten yang sedang dibuat (template: ${content.templateName}):`,
    contentLines,
    ``,
    `Instruksi penulisan:`,
    `- Gaya ngobrol santai sehari-hari, kayak chat ke pelanggan langganan — BUKAN gaya brosur/iklan formal kaku.`,
    `- Satu ide utama, ringkas, kalimat pendek. Boleh pakai kata sehari-hari yang wajar (kok, nih, ternyata).`,
    `- Sertakan CTA yang relevan bila pas dengan konten.`,
    `- WAJIB variasikan kalimat pembuka setiap kali diminta — jangan selalu memakai pola pembuka yang sama seperti "Pernah nggak sih...".`,
    `- Patuhi nada brand dan hindari topik/klaim yang disebut di "hal yang harus dihindari" di atas.`,
    `- Boleh sertakan beberapa hashtag relevan di akhir.`,
    `- EMOJI: sisipkan 2-4 emoji total yang sesuai mood teks (mis. momen hangat ☕🌿, semangat usaha 💪✨, produk baru 🎉, tips 📌💡) — letakkan alami di akhir kalimat, maksimal 1-2 per paragraf, jangan menumpuk beruntun. Hanya emoji sopan & umum; dilarang emoji kasar/vulgar/bermakna ganda (🖕😈🍆🍑💦 dan sejenisnya). Bagian hashtag tanpa emoji.`,
    qualityRules(lang),
    `- Keluarkan hanya teks caption, tanpa penjelasan tambahan atau tanda kutip pembungkus.`,
  ];

  return lines.join("\n");
}
