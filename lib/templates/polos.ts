import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

function buildLayout(height: number): TemplateLayout {
  const scrimH = Math.round(height * 0.38);
  const scrimY = height - scrimH;
  // Footer: 80px dari bawah kanvas (cukup jauh dari tepi bawah)
  const footerY = height - 80;

  return {
    canvas: { width: 1080, height },
    logo: { x: 992, y: 40, size: 36 },
    footerLayout: {
      x: 60,
      y: footerY,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "#e2e8f0",
      nameColor: "#ffffff",
    },
    decorations: [
      {
        box: { x: 0, y: scrimY, width: 1080, height: scrimH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.72) 100%)",
        opacity: 1,
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
        box: { x: 60, y: scrimY + 40, width: 960, height: scrimH - 170 },
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