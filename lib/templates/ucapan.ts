import type { Template } from "./types";
import { defaultBrand } from "./brand";

export const ucapanTemplate: Template = {
  id: "ucapan",
  name: "Ucapan / Selamat",
  canvas: { width: 1080, height: 1350 },
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  slots: [
    {
      id: "greeting",
      type: "text",
      box: { x: 60, y: 400, width: 960, height: 300 },
      fontFamily: "Inter",
      maxFontSize: 80,
      minFontSize: 44,
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
      maxFontSize: 32,
      minFontSize: 22,
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
      box: { x: 60, y: 850, width: 960, height: 350 },
      fit: "cover",
      borderRadius: 24,
      label: "Foto",
      placeholder: "https://...",
    },
  ],
};
