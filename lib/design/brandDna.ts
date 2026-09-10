/**
 * BRAND DNA — poin #4
 * Ekstrak warna dominan dari logo yang sudah diupload user (pakai sharp, sudah ada di stack Keposting).
 * Tidak perlu API AI tambahan — murni image processing, cepat & gratis.
 *
 * Hasilnya disuntik ke: warna badge, warna aksen swash/divider, dan hint ke prompt gambar.
 */

import sharp from "sharp";

export interface BrandColors {
  primary: string; // hex, warna dominan logo
  accent: string; // hex, warna komplementer sederhana
  isDark: boolean; // true kalau primary gelap -> teks di atasnya pakai putih
}

const DEFAULT_BRAND: BrandColors = {
  primary: "#2E7D6B", // teal, sesuai default desain Keposting yang sudah ada
  accent: "#D98E4A", // koral/oranye, aksen default yang sudah dipakai
  isDark: false,
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function relativeLuminance(r: number, g: number, b: number): number {
  // formula luminance standar, dipakai untuk tentukan teks putih/hitam di atas warna ini
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Putar hue ~150 derajat sederhana di ruang RGB untuk dapat warna aksen yang kontras tapi masih harmonis. */
function simpleComplementary(r: number, g: number, b: number): [number, number, number] {
  return [255 - r, 255 - g, 255 - b].map((v, i) => {
    // campur 50% dengan warna asli biar tidak jadi negatif-image ekstrem
    const original = [r, g, b][i];
    return Math.round(v * 0.5 + original * 0.5);
  }) as [number, number, number];
}

/**
 * @param logoBuffer buffer file logo (PNG/JPG/WEBP apa saja, sharp yang urus)
 */
export async function extractBrandColors(logoBuffer: Buffer): Promise<BrandColors> {
  try {
    // resize ke 1x1 dengan resample 'lanczos3' secara efektif jadi rata-rata warna gambar
    const { data } = await sharp(logoBuffer)
      .flatten({ background: "#ffffff" }) // buang transparansi supaya rata-rata tidak bias ke hitam(0,0,0,0)
      .resize(8, 8, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // rata-rata semua piksel 8x8 (lebih stabil dari 1x1 murni)
    let r = 0,
      g = 0,
      b = 0;
    const pixelCount = data.length / 3;
    for (let i = 0; i < data.length; i += 3) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r /= pixelCount;
    g /= pixelCount;
    b /= pixelCount;

    const luminance = relativeLuminance(r, g, b);
    const [ar, ag, ab] = simpleComplementary(r, g, b);

    return {
      primary: rgbToHex(r, g, b),
      accent: rgbToHex(ar, ag, ab),
      isDark: luminance < 128,
    };
  } catch (err) {
    console.error("[brandDna] gagal ekstrak warna, pakai default:", err);
    return DEFAULT_BRAND;
  }
}

export { DEFAULT_BRAND };
