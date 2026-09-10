/**
 * AI LAYOUT DIRECTOR — VERSI ICON-PNG
 * ---------------------------------------
 * Perubahan dari versi emoji sebelumnya: field "icon" pada tiap badge SEKARANG
 * deskripsi visual singkat (Bahasa Inggris) yang dipakai untuk GENERATE ikon
 * PNG asli via Gemini (lib/ai/generateIconPng.ts) — bukan lagi memilih dari
 * daftar emoji terbatas. Badge juga dapat pilihan LAYOUT (row/column) supaya
 * penempatan bervariasi antar generate, bukan selalu 1 pola yang sama.
 */

import { HEADLINE_ANCHORS, BADGE_ANCHORS, buildDesignPrinciplesBrief, type Anchor } from "../design/designPrinciples";

export type TypeScalePreset = "compact" | "standard" | "bold";
export type ScrimBrightness = "dark" | "light";
export type ColorGradePreset = "warm" | "cool" | "neutral" | "vibrant";
export type BadgeLayout = "row" | "column";

export interface BadgePlan {
  /** Deskripsi visual SINGKAT Bahasa Inggris untuk digambar jadi ikon, mis. "spray perfume bottle with mist" */
  iconPrompt: string;
  text: string;
}

export interface LayoutPlanFinal {
  headline: string; // dari user, tidak diubah
  subheadline: string;
  headlineAnchorId: string;
  badgeAnchorId: string;
  badgeLayout: BadgeLayout;
  typeScalePreset: TypeScalePreset;
  scrimBrightness: ScrimBrightness;
  fullnessScore: number;
  colorGrade: ColorGradePreset;
  badges: BadgePlan[]; // 2-3 item
}

export interface LayoutDirectorInput {
  headline: string;
  businessType: string;
  productDescription: string;
  productHighlights?: string;
  imageBase64: string;
  imageMimeType: string;
}

const anchorById = (id: string, pool: Anchor[]): Anchor => pool.find((a) => a.id === id) || pool[0];

function fallbackPlan(input: LayoutDirectorInput): LayoutPlanFinal {
  return {
    headline: input.headline,
    subheadline: "Kualitas terjaga, siap dipakai sehari-hari",
    headlineAnchorId: "bottom-band-safe",
    badgeAnchorId: "badge-bottom-left",
    badgeLayout: "row",
    typeScalePreset: "standard",
    scrimBrightness: "dark",
    fullnessScore: 0.5,
    colorGrade: "neutral",
    badges: [
      { iconPrompt: "checkmark badge shield", text: "Kualitas terjaga" },
      { iconPrompt: "five star rating", text: "Favorit pelanggan" },
    ],
  };
}

function buildPrompt(input: LayoutDirectorInput): string {
  const headlineAnchorList = HEADLINE_ANCHORS.map((a) => `- "${a.id}": ${a.description}`).join("\n");
  const badgeAnchorList = BADGE_ANCHORS.map((a) => `- "${a.id}": ${a.description}`).join("\n");

  return `Kamu adalah Art Director profesional. Lihat gambar terlampir (foto produk hasil AI, belum ada teks).
Judul SUDAH DIPILIH user, TIDAK BOLEH diubah: "${input.headline}"
Jenis usaha: ${input.businessType}
Deskripsi produk: ${input.productDescription}
${input.productHighlights ? `Keunggulan dari user: ${input.productHighlights}` : ""}

${buildDesignPrinciplesBrief()}

HEADLINE ANCHOR tersedia:
${headlineAnchorList}

BADGE ANCHOR tersedia (pilih yang TIDAK bentrok posisi dengan headline anchor yang kamu pilih):
${badgeAnchorList}

TUGAS:
1. Nilai fullnessScore foto (0=banyak area kosong, 1=hampir penuh objek/produk)
2. Pilih headlineAnchorId yang paling cocok
3. Pilih badgeAnchorId — kalau anchor itu "row" pakai badgeLayout "row", kalau "col" pakai "column"
4. Pilih typeScalePreset: "compact"|"standard"|"bold"
5. Tentukan scrimBrightness: "dark" atau "light" (sesuai warna dominan area yang dipilih)
6. Tulis subheadline (max 8 kata, dari data produk, JANGAN hiperbola)
7. Rencanakan 2-3 badge dari DATA PRODUK ASLI (dilarang hiperbola/klaim tanpa dasar). Untuk tiap badge, tulis "iconPrompt": deskripsi visual SANGAT SINGKAT (3-6 kata, BAHASA INGGRIS, cuma nama benda/simbol konkret, mis. "spray bottle mist", "checkmark shield", "clock with sparkle") yang akan digambar jadi ikon flat sederhana — JANGAN deskripsikan adegan/orang/scene, HANYA objek/simbol tunggal.
8. DILARANG tanda hubung/dash ("--","—","–") di subheadline atau teks badge

Balas HANYA JSON:
{
  "fullnessScore": 0-1,
  "headlineAnchorId": "...",
  "badgeAnchorId": "...",
  "badgeLayout": "row|column",
  "typeScalePreset": "compact|standard|bold",
  "scrimBrightness": "dark|light",
  "colorGrade": "warm|cool|neutral|vibrant",
  "subheadline": "...",
  "badges": [{"iconPrompt":"...","text":"..."}, ...]
}
Balas HANYA objek JSON, tanpa markdown/penjelasan.`;
}

function sanitizePlan(raw: any, input: LayoutDirectorInput): LayoutPlanFinal {
  const cleanDash = (s: string) => s.replace(/\s*(--|—|–)\s*/g, ", ").replace(/,\s*,/g, ",").trim();

  const badgesRaw = Array.isArray(raw?.badges) ? raw.badges : [];
  const badges: BadgePlan[] = badgesRaw
    .slice(0, 3)
    .filter((b: any) => b && typeof b.text === "string" && b.text.trim().length > 0 && typeof b.iconPrompt === "string" && b.iconPrompt.trim().length > 0)
    .map((b: any) => ({
      iconPrompt: String(b.iconPrompt).trim().slice(0, 80),
      text: cleanDash(String(b.text)).slice(0, 40),
    }));

  if (badges.length === 0) return fallbackPlan(input);

  const badgeAnchor = anchorById(raw?.badgeAnchorId, BADGE_ANCHORS);
  const inferredLayout: BadgeLayout = badgeAnchor.id.includes("col") ? "column" : "row";

  return {
    headline: input.headline,
    subheadline: typeof raw?.subheadline === "string" ? cleanDash(raw.subheadline).slice(0, 60) : "",
    headlineAnchorId: anchorById(raw?.headlineAnchorId, HEADLINE_ANCHORS).id,
    badgeAnchorId: badgeAnchor.id,
    badgeLayout: raw?.badgeLayout === "column" || raw?.badgeLayout === "row" ? raw.badgeLayout : inferredLayout,
    typeScalePreset: ["compact", "standard", "bold"].includes(raw?.typeScalePreset) ? raw.typeScalePreset : "standard",
    scrimBrightness: raw?.scrimBrightness === "light" ? "light" : "dark",
    fullnessScore: Math.max(0, Math.min(1, Number(raw?.fullnessScore) ?? 0.5)),
    colorGrade: ["warm", "cool", "neutral", "vibrant"].includes(raw?.colorGrade) ? raw.colorGrade : "neutral",
    badges,
  };
}

/**
 * @param callGeminiVision reuse helper vision yang SUDAH ADA di project
 *   (pola sama dengan lib/ai/describeImage.ts) — jangan bikin koneksi baru.
 */
export async function planLayoutFinal(
  input: LayoutDirectorInput,
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>
): Promise<LayoutPlanFinal> {
  const prompt = buildPrompt(input);

  try {
    const textResponse = await callGeminiVision(prompt, input.imageBase64, input.imageMimeType);
    const cleaned = textResponse.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return sanitizePlan(parsed, input);
  } catch (err) {
    console.error("[artDirector] fallback dipakai:", err);
    return fallbackPlan(input);
  }
}
