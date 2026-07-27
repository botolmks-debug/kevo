import type { Template, TemplateLayout } from "./types";
import { defaultBrand } from "./brand";

const layout45: TemplateLayout = {
  canvas: { width: 1080, height: 1350 },
  logo: { x: 40, y: 32, size: 40 },
  footerLayout: {
    x: 40,
    y: 1285,
    direction: "row",
    gap: 18,
    iconSize: 30,
    textSize: 20,
    textColor: "#e2e8f0",
    nameColor: "#ffffff",
  },
  slots: [
    {
      id: "productImage",
      type: "image",
      box: { x: 0, y: 0, width: 1080, height: 1350 },
      fit: "cover",
      label: "Foto Produk",
    },
    {
      id: "productName",
      type: "text",
      box: { x: 60, y: 960, width: 960, height: 70 },
      fontFamily: "Inter",
      maxFontSize: 46,
      minFontSize: 32,
      maxLines: 1,
      align: "left",
      color: "#ffffff",
      fontWeight: 800,
      label: "Nama Produk",
      placeholder: "Ayam Geprek Sambal Bawang",
    },
    {
      id: "price",
      type: "text",
      box: { x: 60, y: 1040, width: 960, height: 70 },
      fontFamily: "Inter",
      maxFontSize: 46,
      minFontSize: 32,
      maxLines: 1,
      align: "left",
      color: "#facc15",
      fontWeight: 800,
      label: "Harga",
      placeholder: "Rp18.000",
    },
    {
      id: "description",
      type: "text",
      box: { x: 60, y: 1120, width: 960, height: 120 },
      fontFamily: "Inter",
      maxFontSize: 30,
      minFontSize: 22,
      maxLines: 3,
      align: "left",
      color: "#e2e8f0",
      fontWeight: 400,
      label: "Deskripsi",
      placeholder: "Ayam crispy dengan sambal bawang pedas, disajikan hangat bersama nasi.",
    },
  ],
};

export const produkTemplate: Template = {
  id: "produk",
  name: "Produk / Menu",
  brand: { ...defaultBrand, backgroundColor: "#0f172a" },
  layouts: {
    "4:5": layout45,
    "1:1": { ...layout45, canvas: { width: 1080, height: 1080 } },
    "9:16": { ...layout45, canvas: { width: 1080, height: 1920 } },
  },
};
