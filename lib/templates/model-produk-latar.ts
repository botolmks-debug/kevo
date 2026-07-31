/**
 * Model 1: Produk + Latar Warna
 * Gambar FULL-BLEED (cover), teks di bawah dengan shadow.
 * Efek latar (blur + overlay + vignette) diproses di client
 * sebelum render (lihat app/generate/page.tsx compositeBackground).
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

function buildLayout(height: number, bgColor: string = "#F97316"): TemplateLayout {
  const W = 1080;
  const footerY = height - 80;
  const scrimH = Math.round(height * 0.35);
  const scrimY = height - scrimH;
  const titleY = scrimY + 40;

  return {
    canvas: { width: W, height },
    logo: { x: W - 120, y: 40, size: 80 },
    footerLayout: {
      x: 60, y: footerY,
      direction: "row", gap: 18,
      iconSize: 42, textSize: 26,
      textColor: "rgba(255,255,255,0.85)",
      nameColor: "#ffffff",
    },
    decorations: [
      // Gradient gelap di bagian bawah untuk teks
      {
        box: { x: 0, y: scrimY, width: W, height: scrimH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.75) 100%)",
        opacity: 1,
        layer: "front",
      },
    ],
    slots: [
      // Foto full-bleed (cover)
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: W, height },
        fit: "cover",
        borderRadius: 0,
        label: "Foto Produk",
        placeholder: "Pilih foto produk",
      },
      // Judul besar
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: Math.round(scrimH * 0.45) },
        fontFamily: "Poppins",
        maxFontSize: 80,
        minFontSize: 36,
        maxLines: 2,
        align: "left",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Nama Produk",
      },
      // Subjudul
      {
        id: "subtitle",
        type: "text",
        box: { x: 60, y: titleY + Math.round(scrimH * 0.46), width: W - 120, height: Math.round(scrimH * 0.25) },
        fontFamily: "Inter",
        maxFontSize: 38,
        minFontSize: 20,
        maxLines: 2,
        align: "left",
        color: "rgba(255,255,255,0.85)",
        fontWeight: 400,
        label: "Tagline / Deskripsi",
        placeholder: "Tagline singkat",
      },
    ],
  };
}

export function createProdukLatarTemplate(bgColor?: string): Template {
  return {
    id: "produk-latar",
    name: "Produk + Latar Warna",
    brand: { ...defaultBrand, backgroundColor: bgColor ?? "#F97316" },
    layouts: {
      "4:5": buildLayout(1350, bgColor),
      "1:1": buildLayout(1080, bgColor),
      "9:16": buildLayout(1920, bgColor),
    },
  };
}

export const produkLatarTemplate = createProdukLatarTemplate();