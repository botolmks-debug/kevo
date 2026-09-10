/**
 * ART DIRECTOR PIPELINE — VERSI ICON-PNG
 * Titik masuk tunggal. Dipanggil SETELAH foto AI selesai digenerate, SEBELUM
 * renderTemplate() dipanggil.
 *
 * BARU: setelah Layout Director dapat rencana badge (iconPrompt + text),
 * pipeline ini generate 2-3 ikon PNG asli (lib/ai/generateIconPng.ts, paralel)
 * dan menyusunnya jadi FreeItem (icon + label) yang BISA DIGESER USER lewat
 * editor DOM yang sudah ada (lib/editor/layoutOverrides.ts) — bukan dibakar
 * permanen ke Template seperti versi emoji sebelumnya.
 */

import { randomUUID } from "crypto";
import { planLayoutFinal, type LayoutDirectorInput, type BadgeLayout } from "./layoutDirectorFinal";
import { extractBrandColors, DEFAULT_BRAND } from "../design/brandDna";
import { applyColorGrade } from "../design/colorGrade";
import { generateIconPng } from "./generateIconPng";
import { buildArtDirectorTemplate, buildArtDirectorValues, CANVAS_WIDTH, CANVAS_HEIGHT_BY_RATIO } from "../templates/artDirectorTemplate";
import { BADGE_ANCHORS, TYPE_SCALE_PRESETS } from "../design/designPrinciples";
import type { Template, AspectRatio } from "../templates/types";
import type { FreeItem } from "../editor/layoutOverrides";

export interface ArtDirectorFinalInput {
  headline: string;
  businessType: string;
  productDescription: string;
  productHighlights?: string;
  photoDataUri: string;
  logoBuffer?: Buffer | null;
  ratio: AspectRatio;
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>;
}

export interface ArtDirectorFinalOutput {
  template: Template;
  values: Record<string, string>;
  gradedPhotoDataUri: string;
  /** Badge (ikon+label) sebagai elemen bebas — dipakai isi editorOverrides.items di client. */
  items: FreeItem[];
  /** Berapa ikon yang BERHASIL digenerate — dipakai keputusan billing token tambahan di route.ts. */
  iconsGenerated: number;
}

const BADGE_GAP = 16;
const TEXT_COLOR = "#FFFFFF";

function pct(v: number, total: number): number {
  return Math.round((v / 100) * total);
}

/** Perkiraan lebar teks badge (px) dari jumlah karakter — cukup untuk penempatan awal, user bisa geser/resize sendiri kalau meleset. */
function estimateTextWidth(text: string, fontSize: number): number {
  return Math.round(text.length * fontSize * 0.56);
}

function buildBadgeItems(
  badges: { iconPrompt: string; text: string; iconDataUri: string | null }[],
  badgeAnchorId: string,
  badgeLayout: BadgeLayout,
  ratio: AspectRatio,
  typeScalePreset: keyof typeof TYPE_SCALE_PRESETS
): FreeItem[] {
  const anchor = BADGE_ANCHORS.find((a) => a.id === badgeAnchorId) || BADGE_ANCHORS[0];
  const canvasHeight = CANVAS_HEIGHT_BY_RATIO[ratio];
  const startX = pct(anchor.xPct, CANVAS_WIDTH);
  const startY = pct(anchor.yPct, canvasHeight);

  const fontSize = TYPE_SCALE_PRESETS[typeScalePreset].badge.maxFontSize;
  const iconSize = Math.round(fontSize * 2.2);
  const items: FreeItem[] = [];

  let cursorX = startX;
  let cursorY = startY;

  for (const badge of badges) {
    if (!badge.iconDataUri) continue; // ikon gagal digenerate -> skip badge ini (best-effort, bukan gagal total)

    const labelWidth = Math.min(estimateTextWidth(badge.text, fontSize), CANVAS_WIDTH - cursorX - iconSize - 24);

    items.push({
      id: `ai-icon-${randomUUID().slice(0, 8)}`,
      kind: "image",
      x: cursorX,
      y: cursorY,
      w: iconSize,
      h: iconSize,
      src: badge.iconDataUri,
    });

    items.push({
      id: `ai-label-${randomUUID().slice(0, 8)}`,
      kind: "text",
      x: cursorX + iconSize + 10,
      y: cursorY + Math.round(iconSize / 2 - fontSize / 2),
      w: Math.max(60, labelWidth),
      h: fontSize + 12,
      text: badge.text,
      fontFamily: "Inter",
      fontSize,
      fontWeight: 600,
      color: TEXT_COLOR,
      align: "left",
      shadow: { blur: 6, color: "#000000", opacity: 0.5 },
    });

    if (badgeLayout === "row") {
      cursorX = cursorX + iconSize + 10 + labelWidth + BADGE_GAP * 2;
    } else {
      cursorY = cursorY + iconSize + BADGE_GAP;
    }
  }

  return items;
}

export async function runArtDirectorFinal(input: ArtDirectorFinalInput): Promise<ArtDirectorFinalOutput> {
  const imageBase64 = input.photoDataUri.split(",")[1] ?? input.photoDataUri;

  const [plan, brand] = await Promise.all([
    planLayoutFinal(
      {
        headline: input.headline,
        businessType: input.businessType,
        productDescription: input.productDescription,
        productHighlights: input.productHighlights,
        imageBase64,
        imageMimeType: "image/png",
      } satisfies LayoutDirectorInput,
      input.callGeminiVision
    ),
    input.logoBuffer ? extractBrandColors(input.logoBuffer) : Promise.resolve(DEFAULT_BRAND),
  ]);

  const template = buildArtDirectorTemplate(plan, brand);

  const rawBuffer = Buffer.from(imageBase64, "base64");
  const gradedBuffer = await applyColorGrade(rawBuffer, plan.colorGrade);
  const gradedPhotoDataUri = `data:image/png;base64,${gradedBuffer.toString("base64")}`;

  const values = buildArtDirectorValues(plan, gradedPhotoDataUri);

  // Generate SEMUA ikon PARALEL (bukan berurutan) — hemat waktu total.
  // best-effort per ikon: 1 ikon gagal TIDAK menggagalkan seluruh generate,
  // badge itu saja yang di-skip (lihat buildBadgeItems: iconDataUri null -> skip).
  const iconResults = await Promise.all(
    plan.badges.map((b) => generateIconPng(b.iconPrompt).catch(() => ({ ok: false as const, error: "exception" })))
  );
  const badgesWithIcons = plan.badges.map((b, i) => ({
    iconPrompt: b.iconPrompt,
    text: b.text,
    iconDataUri: iconResults[i].ok ? (iconResults[i] as { ok: true; dataUri: string }).dataUri : null,
  }));
  const iconsGenerated = badgesWithIcons.filter((b) => b.iconDataUri !== null).length;

  const items = buildBadgeItems(badgesWithIcons, plan.badgeAnchorId, plan.badgeLayout, input.ratio, plan.typeScalePreset);

  return { template, values, gradedPhotoDataUri, items, iconsGenerated };
}
