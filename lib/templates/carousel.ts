/**
 * Model "Carousel": 4 slide feed (4:5). Tiap slide = foto full-bleed yang
 * SUDAH dikomposit dengan overlay warna di client (lihat CarouselContent —
 * overlay dibake ke gambar supaya preview & render Satori 100% sama, tanpa
 * perlu kode dekorasi baru), lalu judul + deskripsi + logo + sosmed di atasnya.
 *
 * Slot "photo" tetap fit=cover x=0,y=0 seukuran kanvas — mengikuti pelajaran
 * renderTemplate: foto full-bleed dirender langsung tanpa div pembungkus.
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

function buildLayout(height: number): TemplateLayout {
  const W = 1080;
  const footerY = height - 80;
  const titleY = Math.round(height * 0.30);
  const titleH = Math.round(height * 0.22);

  return {
    canvas: { width: W, height },
    logo: { x: W - 120, y: 40, size: 80 },
    footerLayout: {
      x: 60,
      y: footerY,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "rgba(255,255,255,0.85)",
      nameColor: "#ffffff",
    },
    // Tanpa scrim — overlay warna sudah dibake ke foto (slot photo).
    decorations: [],
    slots: [
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: W, height },
        fit: "cover",
        borderRadius: 0,
        label: "Latar",
        placeholder: "Foto + overlay",
      },
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: titleH },
        fontFamily: "Poppins",
        maxFontSize: 80,
        minFontSize: 36,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Judul slide",
      },
      {
        id: "desc-0",
        type: "text",
        box: { x: 90, y: titleY + titleH + 24, width: W - 180, height: 150 },
        fontFamily: "Inter",
        maxFontSize: 34,
        minFontSize: 20,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 400,
        label: "Deskripsi",
        placeholder: "Deskripsi slide",
      },
    ],
  };
}

export function createCarouselTemplate(): Template {
  return {
    id: "carousel",
    name: "Carousel",
    brand: { ...defaultBrand, backgroundColor: "#111111" },
    layouts: {
      "4:5": buildLayout(1350),
      "1:1": buildLayout(1080),
      "9:16": buildLayout(1920),
    },
  };
}
