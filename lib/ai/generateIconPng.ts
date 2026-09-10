// lib/ai/generateIconPng.ts
// Generate 1 ikon PNG asli via Gemini image generation, lalu bersihkan
// background-nya pakai removeSolidBackground yang SUDAH ADA & terbukti
// (dipakai juga untuk cutout produk Model 1) — TIDAK membangun sistem
// hapus-background baru, cuma reuse yang sudah teruji.
//
// Kenapa background PUTIH SOLID (bukan minta Gemini langsung transparan):
// Gemini image generation tidak bisa output alpha channel asli — kalau
// diminta "transparent background" hasilnya sering berupa checkerboard
// pattern yang digambar sebagai gambar biasa (BUKAN transparansi
// sungguhan). Solusi yang terbukti jalan di project ini: minta background
// SOLID (putih), lalu deteksi & buang warna itu di sisi kita (flood-fill
// dari tepi, lihat lib/images/backgroundRemoval.ts).

import { generateImage } from "./geminiImage";
import { removeSolidBackground } from "../images/backgroundRemoval";

export type IconGenResult = { ok: true; dataUri: string } | { ok: false; error: string };

/**
 * @param description deskripsi visual singkat (Bahasa Inggris lebih akurat
 *   untuk model image generation), mis. "spray perfume bottle with mist"
 */
export async function generateIconPng(description: string): Promise<IconGenResult> {
  const prompt = `Create a single simple FLAT ICON illustration of: ${description}.
STYLE: modern flat icon / minimal line-art, 1-2 solid colors only, clean geometric shapes, NO gradients, NO shadows, NO photorealism, NO texture, NO background scene or props.
BACKGROUND: PURE SOLID WHITE (#FFFFFF), completely flat, no shading, no vignette — the icon must be the ONLY thing with color, centered, filling about 70% of the frame with even padding on all sides.
Do NOT add any text, letters, or numbers in the icon.`;

  try {
    const result = await generateImage({ prompt, aspectRatio: "1:1" });
    if (!result.ok) return { ok: false, error: result.error };

    const base64 = result.dataUri.replace(/^data:image\/\w+;base64,/, "");
    const rawBuffer = Buffer.from(base64, "base64");

    // Normalisasi ke PNG dulu (jaga-jaga kalau Gemini balas WEBP — akar bug
    // "background hitam" yang sudah pernah ditemukan di project ini untuk
    // kasus serupa) SEBELUM diproses removeSolidBackground.
    const sharp = (await import("sharp")).default;
    const pngBuffer = await sharp(rawBuffer).png().toBuffer();

    const transparentBuffer = await removeSolidBackground(pngBuffer);
    const finalPng = await sharp(transparentBuffer).png().toBuffer();

    return { ok: true, dataUri: `data:image/png;base64,${finalPng.toString("base64")}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "gagal generate ikon" };
  }
}
