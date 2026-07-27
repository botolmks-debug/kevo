import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

const layout45: TemplateLayout = {
  canvas: { width: 1080, height: 1350 },
  logo: { x: 516, y: 1290, size: 28 },
  footerLayout: {
    x: 420,
    y: 1230,
    direction: "row",
    gap: 16,
    iconSize: 26,
    textSize: 18,
    textColor: "#64748b",
    nameColor: "#94a3b8",
  },
  slots: [
    {
      id: "quote",
      type: "text",
      box: { x: 60, y: 430, width: 960, height: 380 },
      fontFamily: "Inter",
      maxFontSize: 80,
      minFontSize: 44,
      maxLines: 4,
      align: "center",
      color: "#ffffff",
      fontWeight: 800,
      label: "Kutipan",
      placeholder: "“Langkah kecil hari ini adalah awal dari perubahan besar.”",
    },
    {
      id: "attribution",
      type: "text",
      box: { x: 60, y: 830, width: 960, height: 60 },
      fontFamily: "Inter",
      maxFontSize: 32,
      minFontSize: 22,
      maxLines: 1,
      align: "center",
      color: "#facc15",
      fontWeight: 600,
      label: "Sumber / Nama",
      placeholder: "— Tim Kevo",
    },
  ],
};

export const quoteTemplate: Template = {
  id: "quote",
  name: "Quote / Motivasi",
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  layouts: {
    "4:5": layout45,
    "1:1": { ...layout45, canvas: { width: 1080, height: 1080 } },
    "9:16": { ...layout45, canvas: { width: 1080, height: 1920 } },
  },
};
