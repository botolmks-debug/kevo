/**
 * ART DIRECTOR TEMPLATE — headline + subheadline + scrim SAJA.
 * ---------------------------------------------------------------
 * Badge/ikon TIDAK LAGI bagian dari Template ini — sekarang jadi FreeItem
 * terpisah (lib/editor/layoutOverrides.ts) yang bisa digeser bebas oleh user,
 * dibangun di lib/ai/artDirectorPipelineFinal.ts. Ini SENGAJA dipisah supaya
 * badge betul-betul bisa "diatur kembali posisinya" (permintaan user) — kalau
 * badge dibakar jadi Decoration/TextSlot tetap di Template, user tidak bisa
 * geser dia lewat editor DOM yang sudah ada.
 */

import type { Template, TemplateLayout, AspectRatio } from "../templates/types";
import { defaultBrand } from "../templates/brand";
import type { LayoutPlanFinal } from "../ai/layoutDirectorFinal";
import type { BrandColors } from "../design/brandDna";
import { HEADLINE_ANCHORS, TYPE_SCALE_PRESETS, computeScrimHeightPct, textColorForScrim } from "../design/designPrinciples";

const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT_BY_RATIO: Record<AspectRatio, number> = { "4:5": 1350, "1:1": 1080, "9:16": 1920 };
export { CANVAS_WIDTH };

function pct(v: number, total: number): number {
  return Math.round((v / 100) * total);
}

function buildLayout(ratio: AspectRatio, plan: LayoutPlanFinal): TemplateLayout {
  const height = CANVAS_HEIGHT_BY_RATIO[ratio];
  const scale = TYPE_SCALE_PRESETS[plan.typeScalePreset];
  const textColor = textColorForScrim(plan.scrimBrightness);
  const scrimHeightPct = computeScrimHeightPct(plan.fullnessScore);
  const scrimTopY = height - pct(scrimHeightPct, height);

  const headlineAnchor = HEADLINE_ANCHORS.find((a) => a.id === plan.headlineAnchorId) || HEADLINE_ANCHORS[0];
  const headlineX = pct(headlineAnchor.xPct, CANVAS_WIDTH);
  const headlineY = pct(headlineAnchor.yPct, height);
  const headlineW = CANVAS_WIDTH - headlineX * 2;
  const subheadlineY = headlineY + scale.headline.maxFontSize + 16;

  const scrimColor =
    plan.scrimBrightness === "dark"
      ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.82) 100%)"
      : "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.88) 100%)";

  return {
    canvas: { width: CANVAS_WIDTH, height },
    logo: { x: CANVAS_WIDTH - 88, y: 40, size: 36 },
    footerLayout: {
      x: 60, y: height - 80, direction: "row", gap: 18, iconSize: 42,
      textSize: 26, textColor: "#e2e8f0", nameColor: "#ffffff",
    },
    decorations: [
      {
        box: { x: 0, y: scrimTopY, width: CANVAS_WIDTH, height: height - scrimTopY },
        shape: "rect",
        color: scrimColor,
        opacity: 1,
        layer: "front",
      },
    ],
    slots: [
      { id: "photo", type: "image", box: { x: 0, y: 0, width: CANVAS_WIDTH, height }, fit: "cover", borderRadius: 0, label: "Foto" },
      {
        id: "caption",
        type: "text",
        box: { x: headlineX, y: headlineY, width: headlineW, height: scale.headline.maxFontSize + 20 },
        fontFamily: "Bebas Neue",
        maxFontSize: scale.headline.maxFontSize,
        minFontSize: scale.headline.minFontSize,
        maxLines: 3,
        align: "left",
        color: textColor,
        fontWeight: 700,
        shadow: { blur: 16, color: "#000000", opacity: 0.5 },
        label: "Judul",
        placeholder: "Tulis judul di sini...",
      },
      {
        id: "subheadline",
        type: "text",
        box: { x: headlineX, y: subheadlineY, width: headlineW, height: scale.subheadline.maxFontSize + 16 },
        fontFamily: "Inter",
        maxFontSize: scale.subheadline.maxFontSize,
        minFontSize: scale.subheadline.minFontSize,
        maxLines: 2,
        align: "left",
        color: textColor,
        fontWeight: 400,
        label: "Subjudul",
        placeholder: "Kalimat pendukung...",
      },
    ],
  };
}

export function buildArtDirectorTemplate(plan: LayoutPlanFinal, _brand: BrandColors): Template {
  return {
    id: "art-director",
    name: "Art Director (AI)",
    brand: { ...defaultBrand, backgroundColor: "#000000" },
    layouts: {
      "4:5": buildLayout("4:5", plan),
      "1:1": buildLayout("1:1", plan),
      "9:16": buildLayout("9:16", plan),
    },
  };
}

export function buildArtDirectorValues(plan: LayoutPlanFinal, photoDataUri: string): Record<string, string> {
  return {
    photo: photoDataUri,
    caption: plan.headline,
    subheadline: plan.subheadline,
  };
}
