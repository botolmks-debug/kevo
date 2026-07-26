import type { Template } from "./types";
import { defaultBrand } from "./brand";

export const pengumumanTemplate: Template = {
  id: "pengumuman",
  name: "Pengumuman",
  canvas: { width: 1080, height: 1350 },
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  slots: [
    {
      id: "headline",
      type: "text",
      box: { x: 60, y: 160, width: 960, height: 260 },
      fontFamily: "Inter",
      maxFontSize: 64,
      minFontSize: 36,
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
      box: { x: 60, y: 460, width: 960, height: 520 },
      fit: "cover",
      borderRadius: 24,
      label: "Foto",
      placeholder: "https://...",
    },
    {
      id: "body",
      type: "text",
      box: { x: 60, y: 1020, width: 960, height: 200 },
      fontFamily: "Inter",
      maxFontSize: 32,
      minFontSize: 22,
      maxLines: 4,
      align: "left",
      color: "#e2e8f0",
      fontWeight: 400,
      label: "Isi",
      placeholder: "Mulai Senin depan, layanan buka pukul 08.00–15.00. Terima kasih atas pengertiannya.",
    },
  ],
};
