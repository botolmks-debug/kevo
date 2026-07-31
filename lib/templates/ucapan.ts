import type { Decoration, Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

const CONFETTI_COLORS = ["#facc15", "#2563eb", "#f472b6", "#34d399"];

function confetti(x: number, y: number, size: number, colorIndex: number, isCircle: boolean): Decoration {
  return {
    box: { x, y, width: size, height: size },
    shape: isCircle ? "circle" : "rect",
    color: CONFETTI_COLORS[colorIndex % CONFETTI_COLORS.length],
    opacity: 0.55,
    rotateDeg: isCircle ? undefined : 20,
    borderRadius: isCircle ? undefined : 4,
  };
}

const layout45: TemplateLayout = {
  canvas: { width: 1080, height: 1350 },
  logo: { x: 512, y: 1266, size: 56 },
  footerLayout: {
    x: 300,
    y: 1195,
    direction: "row",
    gap: 22,
    iconSize: 49,
    textSize: 29,
    textColor: "#e2e8f0",
    nameColor: "#ffffff",
  },
  decorations: [
    confetti(110, 90, 28, 0, true),
    confetti(220, 220, 20, 1, false),
    confetti(880, 110, 24, 2, true),
    confetti(940, 250, 30, 3, false),
    confetti(90, 320, 22, 2, false),
    confetti(960, 340, 20, 0, true),
    confetti(150, 1000, 26, 1, true),
    confetti(900, 980, 22, 3, false),
    confetti(60, 750, 18, 3, true),
    confetti(1000, 720, 26, 0, false),
  ],
  slots: [
    {
      id: "greeting",
      type: "text",
      box: { x: 60, y: 400, width: 960, height: 300 },
      fontFamily: "Inter",
      maxFontSize: 88,
      minFontSize: 48,
      maxLines: 3,
      align: "center",
      color: "#ffffff",
      fontWeight: 800,
      label: "Ucapan",
      placeholder: "Selamat Hari Kemerdekaan!",
    },
    {
      id: "detail",
      type: "text",
      box: { x: 60, y: 720, width: 960, height: 80 },
      fontFamily: "Inter",
      maxFontSize: 36,
      minFontSize: 24,
      maxLines: 2,
      align: "center",
      color: "#facc15",
      fontWeight: 600,
      label: "Nama / Tanggal",
      placeholder: "17 Agustus 2026",
    },
    {
      id: "photo",
      type: "image",
      box: { x: 60, y: 850, width: 960, height: 320 },
      fit: "contain",
      borderRadius: 24,
      label: "Foto",
    },
  ],
};

export const ucapanTemplate: Template = {
  id: "ucapan",
  name: "Ucapan / Selamat",
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  layouts: {
    "4:5": layout45,
    "1:1": { ...layout45, canvas: { width: 1080, height: 1080 } },
    "9:16": { ...layout45, canvas: { width: 1080, height: 1920 } },
  },
};
