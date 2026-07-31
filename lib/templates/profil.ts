import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

const layout45: TemplateLayout = {
  canvas: { width: 1080, height: 1350 },
  logo: { x: 976, y: 36, size: 56 },
  footerLayout: {
    x: 60,
    y: 1080,
    direction: "row",
    gap: 32,
    iconSize: 73,
    textSize: 34,
    textColor: "#0f172a",
    nameColor: "#0f172a",
  },
  decorations: [
    { box: { x: -80, y: -80, width: 300, height: 300 }, shape: "circle", color: "#2563eb", opacity: 0.12 },
  ],
  slots: [
    {
      id: "photo",
      type: "image",
      box: { x: 60, y: 140, width: 960, height: 500 },
      fit: "contain",
      borderRadius: 24,
      label: "Foto",
    },
    {
      id: "name",
      type: "text",
      box: { x: 60, y: 660, width: 960, height: 70 },
      fontFamily: "Inter",
      maxFontSize: 48,
      minFontSize: 32,
      maxLines: 1,
      align: "left",
      color: "#0f172a",
      fontWeight: 800,
      label: "Nama",
      placeholder: "dr. Andi Wijaya",
    },
    {
      id: "role",
      type: "text",
      box: { x: 60, y: 740, width: 960, height: 50 },
      fontFamily: "Inter",
      maxFontSize: 30,
      minFontSize: 22,
      maxLines: 1,
      align: "left",
      color: "#2563eb",
      fontWeight: 600,
      label: "Peran / Jabatan",
      placeholder: "Dokter Umum",
    },
    {
      id: "description",
      type: "text",
      box: { x: 60, y: 810, width: 960, height: 200 },
      fontFamily: "Inter",
      maxFontSize: 28,
      minFontSize: 20,
      maxLines: 4,
      align: "left",
      color: "#475569",
      fontWeight: 400,
      label: "Deskripsi Singkat",
      placeholder: "Berpengalaman lebih dari 10 tahun melayani pasien dengan pendekatan yang ramah dan komunikatif.",
    },
  ],
};

export const profilTemplate: Template = {
  id: "profil",
  name: "Profil / Perkenalan",
  brand: { ...defaultBrand, backgroundColor: "#ffffff" },
  layouts: {
    "4:5": layout45,
    "1:1": { ...layout45, canvas: { width: 1080, height: 1080 } },
    "9:16": { ...layout45, canvas: { width: 1080, height: 1920 } },
  },
};
