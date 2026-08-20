/**
 * Model "Konten Standar": gambar FULL-BLEED (cover) + teks dinamis.
 * Slot teks dibuat sesuai jumlah deskripsi (title + desc-0..desc-(N-1)).
 * Gambar bisa hasil olah AI (dari judul+deskripsi) atau apa adanya.
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

function buildLayout(height: number, descCount: number, titleText?: string, descTexts?: string[]): TemplateLayout {
  const W = 1080;
  const footerY = height - 80;

  // Scrim lebih besar (52%) supaya ada ruang cukup untuk judul + deskripsi
  const scrimH = Math.round(height * 0.52);
  const scrimY = height - scrimH;
  const titleY = scrimY + 32;
  const gap = 10;

  const count = Math.max(0, descCount);

  // --- Judul: font lebih kecil (60px) supaya tidak makan terlalu banyak ruang ---
  const titleMaxFont = 60;
  const titleCharsPerLine = Math.max(1, Math.floor((W - 120) / (titleMaxFont * 0.55)));
  const titleLines = titleText && titleText.trim()
    ? Math.max(1, Math.min(3, Math.ceil(titleText.trim().length / titleCharsPerLine)))
    : 2;

  // --- Deskripsi: tinggi DINAMIS per slot ---
  const descMaxFont = 32;
  const descCharsPerLine = Math.max(1, Math.floor((W - 120) / (descMaxFont * 0.55)));
  const descMaxLines = 3;

  const descHeights = Array.from({ length: count }, (_, i) => {
    const txt = descTexts?.[i];
    const lines = txt && txt.trim()
      ? Math.min(descMaxLines, Math.max(1, Math.ceil(txt.trim().length / descCharsPerLine)))
      : 2;
    return Math.max(
      Math.round(descMaxFont * 1.3),
      Math.round(lines * descMaxFont * 1.25) + 8,
    );
  });

  const descsBlock = count > 0
    ? descHeights.reduce((a, b) => a + b, 0) + (count - 1) * gap + 12
    : 0;

  const maxTitleH = footerY - titleY - descsBlock - 16;
  const titleH = Math.max(
    Math.round(titleMaxFont * 1.2),
    Math.min(Math.round(titleLines * titleMaxFont * 1.15) + 8, maxTitleH),
  );

  // Posisi Y tiap deskripsi
  const descYPositions: number[] = [];
  let curY = titleY + titleH + 10;
  for (let i = 0; i < count; i++) {
    descYPositions.push(curY);
    curY += descHeights[i] + gap;
  }

  const descSlots = Array.from({ length: count }, (_, i) => ({
    id: `desc-${i}`,
    type: "text" as const,
    box: {
      x: 60,
      y: descYPositions[i],
      width: W - 120,
      height: descHeights[i],
    },
    fontFamily: "Inter",
    maxFontSize: descMaxFont,
    minFontSize: 16,
    maxLines: descMaxLines,
    align: "left" as const,
    color: "rgba(255,255,255,0.9)",
    fontWeight: 400,
    label: `Deskripsi ${i + 1}`,
    placeholder: `Deskripsi ${i + 1}`,
  }));

  return {
    canvas: { width: W, height },
    logo: { x: W - 120, y: 40, size: 80 },
    footerLayout: {
      x: 60,
      y: footerY,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "rgba(255,255,255,0.85)",
      nameColor: "#ffffff",
    },
    decorations: [
      {
        box: { x: 0, y: scrimY, width: W, height: scrimH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.72) 100%)",
        opacity: 1,
        layer: "front",
      },
    ],
    slots: [
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: W, height },
        fit: "cover",
        borderRadius: 0,
        label: "Gambar",
        placeholder: "Pilih gambar",
      },
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: titleH },
        fontFamily: "Poppins",
        maxFontSize: titleMaxFont,
        minFontSize: 28,
        maxLines: 3,
        align: "left",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Judul",
      },
      ...descSlots,
    ],
  };
}

export function createStandarTemplate(descCount: number, titleText?: string, descTexts?: string[]): Template {
  return {
    id: "standar",
    name: "Konten Standar",
    brand: { ...defaultBrand, backgroundColor: "#111111" },
    layouts: {
      "4:5": buildLayout(1350, descCount, titleText, descTexts),
      "1:1": buildLayout(1080, descCount, titleText, descTexts),
      "9:16": buildLayout(1920, descCount, titleText, descTexts),
    },
  };
}
