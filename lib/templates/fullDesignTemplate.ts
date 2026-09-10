/**
 * FULL DESIGN TEMPLATE — foto SUDAH berisi semua teks (judul/subjudul/badge
 * dibakar langsung oleh Gemini). Template ini SENGAJA minimal: cuma slot foto
 * full-bleed + logo + footer sosmed — TIDAK ADA text slot sama sekali,
 * karena tidak ada apa pun yang perlu di-overlay Satori lagi.
 */

import type { Template, TemplateLayout, AspectRatio } from "./types";
import { defaultBrand } from "./brand";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT_BY_RATIO: Record<AspectRatio, number> = { "4:5": 1350, "1:1": 1080, "9:16": 1920 };

function buildLayout(height: number): TemplateLayout {
  const footerY = height - 80;
  return {
    canvas: { width: CANVAS_WIDTH, height },
    logo: { x: CANVAS_WIDTH - 88, y: 40, size: 36 },
    footerLayout: {
      x: 60, y: footerY, direction: "row", gap: 18, iconSize: 42,
      textSize: 26, textColor: "#e2e8f0", nameColor: "#ffffff",
    },
    // Tanpa decorations — Gemini sudah diminta sisakan ruang bawah polos sendiri.
    slots: [
      { id: "photo", type: "image", box: { x: 0, y: 0, width: CANVAS_WIDTH, height }, fit: "cover", borderRadius: 0, label: "Foto (desain lengkap)" },
    ],
  };
}

export function buildFullDesignTemplate(): Template {
  return {
    id: "full-design",
    name: "Desain Lengkap (AI)",
    brand: { ...defaultBrand, backgroundColor: "#000000" },
    layouts: {
      "4:5": buildLayout(CANVAS_HEIGHT_BY_RATIO["4:5"]),
      "1:1": buildLayout(CANVAS_HEIGHT_BY_RATIO["1:1"]),
      "9:16": buildLayout(CANVAS_HEIGHT_BY_RATIO["9:16"]),
    },
  };
}
