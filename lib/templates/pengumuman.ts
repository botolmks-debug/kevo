import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

// Beda dari warna logo (#2563EB) supaya logo tidak "hilang" ditelan band.
const BAND_COLOR = "#1e293b";

const layout45: TemplateLayout = {
  canvas: { width: 1080, height: 1350 },
  logo: { x: 40, y: 34, size: 64 },
  footerLayout: {
    x: 60,
    y: 1250,
    direction: "row",
    gap: 28,
    iconSize: 62,
    textSize: 34,
    textColor: "#e2e8f0",
    nameColor: "#ffffff",
  },
  decorations: [{ box: { x: 0, y: 0, width: 1080, height: 140 }, shape: "rect", color: BAND_COLOR }],
  slots: [
    {
      id: "headline",
      type: "text",
      box: { x: 60, y: 190, width: 960, height: 260 },
      fontFamily: "Inter",
      maxFontSize: 68,
      minFontSize: 38,
      maxLines: 3,
      align: "left",
      color: "#ffffff",
      fontWeight: 700,
      label: "Headline",
      placeholder: "Perubahan Jadwal Layanan Minggu Ini",
    },
    {
      id: "photo",
      type: "image",
      box: { x: 60, y: 480, width: 960, height: 500 },
      fit: "contain",
      borderRadius: 24,
      label: "Foto",
    },
    {
      id: "body",
      type: "text",
      box: { x: 60, y: 1010, width: 960, height: 200 },
      fontFamily: "Inter",
      maxFontSize: 34,
      minFontSize: 24,
      maxLines: 4,
      align: "left",
      color: "#e2e8f0",
      fontWeight: 400,
      label: "Isi",
      placeholder: "Mulai Senin depan, layanan buka pukul 08.00–15.00. Terima kasih atas pengertiannya.",
    },
  ],
};

export const pengumumanTemplate: Template = {
  id: "pengumuman",
  name: "Pengumuman",
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  layouts: {
    "4:5": layout45,
    "1:1": { ...layout45, canvas: { width: 1080, height: 1080 } },
    "9:16": { ...layout45, canvas: { width: 1080, height: 1920 } },
  },
};
