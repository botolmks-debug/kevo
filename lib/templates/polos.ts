import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

// Posisi judul di gambar — user demo bisa pilih.
export type TitlePos = "top" | "center" | "bottom";

function buildLayout(height: number, titlePos: TitlePos): TemplateLayout {
  // Scrim: untuk "top" scrim di atas, selain itu di bawah (biar teks terbaca).
  const scrimH = Math.round(height * 0.42);
  const scrimBottomY = height - scrimH;
  const footerY = height - 80;

  // Kotak judul per posisi. Lebar & tinggi sama, cuma Y (vertikal) beda.
  const titleH = Math.round(scrimH * 0.42);
  let titleY: number;
  if (titlePos === "top") {
    titleY = Math.round(height * 0.08); // dekat atas (area tutup botol/atas foto)
  } else if (titlePos === "center") {
    titleY = Math.round(height * 0.5 - titleH / 2); // tengah kanvas
  } else {
    titleY = scrimBottomY + Math.round(scrimH * 0.30); // bawah, di atas footer (default)
  }

  // Scrim mengikuti posisi teks supaya teks putih selalu terbaca.
  const decorations: TemplateLayout["decorations"] =
    titlePos === "top"
      ? [
          {
            box: { x: 0, y: 0, width: 1080, height: Math.round(height * 0.32) },
            shape: "rect",
            color:
              "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0) 100%)",
            opacity: 1,
            layer: "front",
          },
          // scrim bawah tetap ada untuk footer
          {
            box: { x: 0, y: scrimBottomY, width: 1080, height: scrimH },
            shape: "rect",
            color:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.72) 100%)",
            opacity: 1,
            layer: "front",
          },
        ]
      : titlePos === "center"
        ? [
            {
              box: { x: 0, y: Math.round(height * 0.30), width: 1080, height: Math.round(height * 0.40) },
              shape: "rect",
              color:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0) 100%)",
              opacity: 1,
              layer: "front",
            },
            {
              box: { x: 0, y: scrimBottomY, width: 1080, height: scrimH },
              shape: "rect",
              color:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.72) 100%)",
              opacity: 1,
              layer: "front",
            },
          ]
        : [
            {
              box: { x: 0, y: scrimBottomY, width: 1080, height: scrimH },
              shape: "rect",
              color:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.82) 100%)",
              opacity: 1,
              layer: "front",
            },
          ];

  return {
    canvas: { width: 1080, height },
    logo: { x: 992, y: 40, size: 36 },
    footerLayout: {
      x: 60,
      y: footerY,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "#e2e8f0",
      nameColor: "#ffffff",
    },
    decorations,
    slots: [
      {
        id: "photo",
        type: "image",
        box: { x: 0, y: 0, width: 1080, height },
        fit: "cover",
        borderRadius: 0,
        label: "Foto",
      },
      {
        id: "caption",
        type: "text",
        box: { x: 80, y: titleY, width: 920, height: titleH },
        fontFamily: "Bebas Neue",
        maxFontSize: 92,
        minFontSize: 48,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 700,
        shadow: { blur: 16, color: "#000000", opacity: 0.55 },
        outline: { width: 2, color: "rgba(0,0,0,0.45)" },
        label: "Judul",
        placeholder: "Tulis judul di sini...",
      },
    ],
  };
}

// Bangun template polos untuk posisi judul tertentu.
// Default "bottom" supaya perilaku lama tidak berubah.
export function buildPolosTemplate(titlePos: TitlePos = "bottom"): Template {
  return {
    id: "polos",
    name: "Tanpa Template",
    brand: { ...defaultBrand, backgroundColor: "#000000" },
    layouts: {
      "4:5": buildLayout(1350, titlePos),
      "1:1": buildLayout(1080, titlePos),
      "9:16": buildLayout(1920, titlePos),
    },
  };
}


// Varian POSISI BEBAS (drag-and-drop demo): judul diletakkan sesuai koordinat
// pusat (xPct,yPct) dalam 0..1 relatif kanvas. align center + scrim radial-ish
// (pakai gradient vertikal lembut di sekitar Y teks) supaya tetap terbaca.
function buildLayoutAt(height: number, xPct: number, yPct: number): TemplateLayout {
  const scrimH = Math.round(height * 0.42);
  const scrimBottomY = height - scrimH;
  const footerY = height - 80;

  const titleH = Math.round(scrimH * 0.42);
  const titleW = 920;
  // pusat teks -> kiri-atas box (clamp biar tidak keluar kanvas)
  const cx = Math.max(0, Math.min(1, xPct)) * 1080;
  const cy = Math.max(0, Math.min(1, yPct)) * height;
  const boxX = Math.round(Math.max(20, Math.min(1080 - titleW - 20, cx - titleW / 2)));
  const boxY = Math.round(Math.max(20, Math.min(height - titleH - 20, cy - titleH / 2)));

  // scrim lembut mengelilingi Y teks + scrim bawah utk footer
  const bandY = Math.max(0, boxY - Math.round(height * 0.04));
  const bandH = Math.min(height - bandY, titleH + Math.round(height * 0.10));

  return {
    canvas: { width: 1080, height },
    // Logo Keposting sebagai WATERMARK di kanan bawah, opacity rendah.
    // Kalau hasil demo di-share, logo ikut tersebar (promosi organik).
    logo: { x: 964, y: height - 108, size: 68, opacity: 0.4 },
    footerLayout: {
      x: 60, y: footerY, direction: "row", gap: 18, iconSize: 42,
      textSize: 26, textColor: "#e2e8f0", nameColor: "#ffffff",
    },
    decorations: [
      {
        box: { x: 0, y: bandY, width: 1080, height: bandH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0) 100%)",
        opacity: 1, layer: "front",
      },
      {
        box: { x: 0, y: scrimBottomY, width: 1080, height: scrimH },
        shape: "rect",
        color: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.72) 100%)",
        opacity: 1, layer: "front",
      },
    ],
    slots: [
      { id: "photo", type: "image", box: { x: 0, y: 0, width: 1080, height }, fit: "cover", borderRadius: 0, label: "Foto" },
      {
        id: "caption", type: "text",
        box: { x: boxX, y: boxY, width: titleW, height: titleH },
        fontFamily: "Bebas Neue", maxFontSize: 92, minFontSize: 48, maxLines: 3,
        align: "center", color: "#ffffff", fontWeight: 700,
        shadow: { blur: 16, color: "#000000", opacity: 0.55 },
        outline: { width: 2, color: "rgba(0,0,0,0.45)" },
        label: "Judul", placeholder: "Tulis judul di sini...",
      },
    ],
  };
}

// Template dgn judul di koordinat bebas (dipakai demo-render saat kirim final).
export function buildPolosTemplateAt(xPct: number, yPct: number): Template {
  return {
    id: "polos",
    name: "Tanpa Template",
    brand: { ...defaultBrand, backgroundColor: "#000000" },
    layouts: {
      "4:5": buildLayoutAt(1350, xPct, yPct),
      "1:1": buildLayoutAt(1080, xPct, yPct),
      "9:16": buildLayoutAt(1920, xPct, yPct),
    },
  };
}

// Kompatibel dengan pemakaian lama (import { polosTemplate }).
export const polosTemplate: Template = buildPolosTemplate("bottom");
