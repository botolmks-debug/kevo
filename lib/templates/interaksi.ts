// Template untuk jenis konten "Interaksi" — gambar penuh tanpa scrim/kotak gelap.
// Footer sosmed + logo tetap tampil, tapi tidak ada overlay teks di atas gambar
// (headline tampil langsung di atas gambar yang cerah/ilustrasi).
import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

function buildLayout(height: number): TemplateLayout {
  return {
    canvas: { width: 1080, height },
    logo: { x: 992, y: 40, size: 36 },
    footerLayout: {
      x: 60,
      y: height - 80,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "#ffffff",
      nameColor: "#ffffff",
    },
    // Interaksi = ilustrasi penuh, TANPA scrim/kotak gelap (permintaan user).
    decorations: [],
    slots: [
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: 1080, height },
        fit: "cover",
        borderRadius: 0,
        label: "Gambar",
      },
      {
        id: "caption",
        type: "text",
        // Teks di bagian atas gambar (bukan di atas kotak hitam)
        box: { x: 60, y: 60, width: 960, height: Math.round(height * 0.25) },
        fontFamily: "Poppins",
        maxFontSize: 52,
        minFontSize: 28,
        maxLines: 4,
        align: "left",
        color: "#ffffff",
        fontWeight: 700,
        label: "Teks",
        placeholder: "Tulis caption di sini...",
      },
    ],
  };
}

export const interaksiTemplate: Template = {
  id: "interaksi",
  name: "Interaksi",
  brand: { ...defaultBrand, backgroundColor: "#000000" },
  layouts: {
    "4:5": buildLayout(1350),
    "1:1": buildLayout(1080),
    "9:16": buildLayout(1920),
  },
};