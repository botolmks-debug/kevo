/**
 * COLOR GRADING — poin #5
 * 1 langkah post-process ringan pakai sharp, dijalankan setelah Gemini hasilkan foto
 * dan SEBELUM masuk compositing/Satori. Murah secara compute, efeknya besar di kesan "profesional".
 *
 * Preset di sini sengaja SUBTLE (bukan filter Instagram norak) — tujuannya konsistensi & mood,
 * bukan mengubah warna produk jadi tidak akurat.
 */

import sharp from "sharp";

// Didefinisikan lokal di sini (bukan import dari layoutDirector v1) supaya paket v3
// berdiri sendiri tanpa perlu file v1 ikut disalin. Nilainya harus tetap sinkron
// dengan union type "colorGrade" yang dipakai layoutDirectorV3.ts.
export type ColorGradePreset = "warm" | "cool" | "neutral" | "vibrant";

interface GradeParams {
  brightness: number; // 1 = tak berubah
  saturation: number; // 1 = tak berubah
  hue: number; // derajat, 0 = tak berubah
  tint?: { color: string; opacity: number }; // overlay warna tipis, opsional
}

const GRADE_PRESETS: Record<ColorGradePreset, GradeParams> = {
  warm: { brightness: 1.03, saturation: 1.08, hue: 4, tint: { color: "#FFB37A", opacity: 0.05 } },
  cool: { brightness: 1.02, saturation: 1.03, hue: -6, tint: { color: "#7AB8FF", opacity: 0.04 } },
  neutral: { brightness: 1.02, saturation: 1.05, hue: 0 },
  vibrant: { brightness: 1.05, saturation: 1.22, hue: 0 },
};

/**
 * @param imageBuffer buffer foto hasil Gemini (sebelum di-composite dengan teks/logo/badge)
 * @param preset dari LayoutPlan.colorGrade
 */
export async function applyColorGrade(imageBuffer: Buffer, preset: ColorGradePreset): Promise<Buffer> {
  const params = GRADE_PRESETS[preset] || GRADE_PRESETS.neutral;

  try {
    let pipeline = sharp(imageBuffer).modulate({
      brightness: params.brightness,
      saturation: params.saturation,
      hue: params.hue,
    });

    if (params.tint) {
      const meta = await sharp(imageBuffer).metadata();
      const width = meta.width || 1080;
      const height = meta.height || 1350;

      const tintOverlay = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: params.tint.color,
        },
      })
        .png()
        .toBuffer();

      pipeline = sharp(await pipeline.toBuffer()).composite([
        { input: tintOverlay, blend: "soft-light", opacity: params.tint.opacity } as any,
      ]);
    }

    return await pipeline.png().toBuffer();
  } catch (err) {
    console.error("[colorGrade] gagal grading, pakai gambar asli:", err);
    return imageBuffer;
  }
}
