/**
 * Model "Teks Saja": TANPA foto — latar warna solid pilihan user + judul &
 * deskripsi besar di tengah. Slot "photo" tetap ada (fit=cover) tapi diisi
 * gambar 8x8px warna solid buatan client — reuse 100% jalur render foto yang
 * sudah ada (preview & Satori) tanpa perlu kode baru di CanvasEditor/renderTemplate.
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

function buildLayout(height: number, descCount: number): TemplateLayout {
  const W = 1080;
  const footerY = height - 80;
  const titleY = Math.round(height * 0.32);
  const titleH = Math.round(height * 0.20);
  const descH = 60;
  const gap = 12;

  const count = Math.max(0, descCount);
  const descSlots = Array.from({ length: count }, (_, i) => ({
    id: `desc-${i}`,
    type: "text" as const,
    box: {
      x: 60,
      y: titleY + titleH + 20 + i * (descH + gap),
      width: W - 120,
      height: descH,
    },
    fontFamily: "Inter",
    maxFontSize: 32,
    minFontSize: 18,
    maxLines: 2,
    align: "center" as const,
    color: "#ffffff",
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
    // Tanpa scrim — latarnya sudah warna solid polos, tidak butuh gradasi gelap.
    decorations: [],
    slots: [
      // "Foto" di sini sebenarnya warna solid (dibuat client, lihat komponen).
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: W, height },
        fit: "cover",
        borderRadius: 0,
        label: "Latar",
        placeholder: "Pilih warna",
      },
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: titleH },
        fontFamily: "Poppins",
        maxFontSize: 88,
        minFontSize: 36,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Judul",
      },
      ...descSlots,
    ],
  };
}

export function createTeksSajaTemplate(descCount: number): Template {
  return {
    id: "teks-saja",
    name: "Teks Saja",
    brand: { ...defaultBrand, backgroundColor: "#111111" },
    layouts: {
      "4:5": buildLayout(1350, descCount),
      "1:1": buildLayout(1080, descCount),
      "9:16": buildLayout(1920, descCount),
    },
  };
}
