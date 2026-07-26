import type { Template } from "./types";
import { defaultBrand } from "./brand";

export const quoteTemplate: Template = {
  id: "quote",
  name: "Quote / Motivasi",
  canvas: { width: 1080, height: 1350 },
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  slots: [
    {
      id: "quote",
      type: "text",
      box: { x: 60, y: 450, width: 960, height: 350 },
      fontFamily: "Inter",
      maxFontSize: 72,
      minFontSize: 40,
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
      box: { x: 60, y: 820, width: 960, height: 60 },
      fontFamily: "Inter",
      maxFontSize: 28,
      minFontSize: 20,
      maxLines: 1,
      align: "center",
      color: "#facc15",
      fontWeight: 600,
      label: "Sumber / Nama",
      placeholder: "— Tim Kevo",
    },
  ],
};
