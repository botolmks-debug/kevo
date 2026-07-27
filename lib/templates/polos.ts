import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

// "Tanpa Template" = benar-benar polos: foto full-bleed menutupi seluruh
// kanvas, teks + footer jadi overlay di atasnya (scrim gelap tipis di bawah
// supaya kebaca), tanpa frame/pattern apa pun (spec-perbaikan-render-generate
// bagian A2). Dihitung dari tinggi kanvas supaya proporsional di ketiga rasio.
function buildLayout(height: number): TemplateLayout {
  const scrimHeight = Math.round(height * 0.28);
  const scrimY = height - scrimHeight;

  return {
    canvas: { width: 1080, height },
    logo: { x: 992, y: 40, size: 36 },
    footerLayout: {
      x: 60,
      y: height - 60,
      direction: "row",
      gap: 18,
      iconSize: 32,
      textSize: 20,
      textColor: "#e2e8f0",
      nameColor: "#ffffff",
    },
    decorations: [
      {
        box: { x: 0, y: scrimY, width: 1080, height: scrimHeight },
        shape: "rect",
        color: "#000000",
        opacity: 0.55,
        layer: "front",
      },
    ],
    slots: [
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: 1080, height },
        fit: "cover",
        borderRadius: 0,
        label: "Foto",
      },
      {
        id: "caption",
        type: "text",
        box: { x: 60, y: scrimY + 20, width: 960, height: scrimHeight - 130 },
        fontFamily: "Inter",
        maxFontSize: 36,
        minFontSize: 22,
        maxLines: 5,
        align: "left",
        color: "#ffffff",
        fontWeight: 400,
        label: "Teks",
        placeholder: "Tulis caption di sini...",
      },
    ],
  };
}

export const polosTemplate: Template = {
  id: "polos",
  name: "Tanpa Template",
  brand: { ...defaultBrand, backgroundColor: "#000000" },
  layouts: {
    "4:5": buildLayout(1350),
    "1:1": buildLayout(1080),
    "9:16": buildLayout(1920),
  },
};
