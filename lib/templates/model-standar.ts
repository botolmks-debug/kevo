/**
 * Model "Konten Standar": gambar FULL-BLEED (cover) + teks dinamis.
 * Slot teks dibuat sesuai jumlah deskripsi (title + desc-0..desc-(N-1)).
 * Gambar bisa hasil olah AI (dari judul+deskripsi) atau apa adanya.
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

function buildLayout(height: number, descCount: number): TemplateLayout {
  const W = 1080;
  const footerY = height - 80;
  const scrimH = Math.round(height * 0.44);
  const scrimY = height - scrimH;
  const titleY = scrimY + 32;
  const titleH = Math.round(scrimH * 0.30);
  const descH = 66;
  const gap = 10;

  const count = Math.max(0, descCount);
  const descSlots = Array.from({ length: count }, (_, i) => ({
    id: `desc-${i}`,
    type: "text" as const,
    box: {
      x: 60,
      y: titleY + titleH + 8 + i * (descH + gap),
      width: W - 120,
      height: descH,
    },
    fontFamily: "Inter",
    maxFontSize: 34,
    minFontSize: 18,
    maxLines: 3,
    align: "left" as const,
    color: "rgba(255,255,255,0.9)",
    fontWeight: 400,
    label: `Deskripsi ${i + 1}`,
    placeholder: `Deskripsi ${i + 1}`,
  }));

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
    decorations: [
      // Scrim gelap tipis di bawah supaya teks tetap terbaca di atas gambar.
      {
        box: { x: 0, y: scrimY, width: W, height: scrimH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.72) 100%)",
        opacity: 1,
        layer: "front",
      },
    ],
    slots: [
      // Gambar full-bleed (cover)
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: W, height },
        fit: "cover",
        borderRadius: 0,
        label: "Gambar",
        placeholder: "Pilih gambar",
      },
      // Judul besar
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: titleH },
        fontFamily: "Poppins",
        maxFontSize: 72,
        minFontSize: 32,
        maxLines: 2,
        align: "left",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Judul",
      },
      ...descSlots,
    ],
  };
}

export function createStandarTemplate(descCount: number): Template {
  return {
    id: "standar",
    name: "Konten Standar",
    brand: { ...defaultBrand, backgroundColor: "#111111" },
    layouts: {
      "4:5": buildLayout(1350, descCount),
      "1:1": buildLayout(1080, descCount),
      "9:16": buildLayout(1920, descCount),
    },
  };
}