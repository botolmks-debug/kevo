// lib/images/splitWideImage.ts
// Potong 1 foto lebar jadi 2 bagian (kiri/kanan) — dipakai untuk carousel
// mode "foto nyambung antar slide". Karena ini literal 1 foto yang sama
// dipotong dua, sambungannya DIJAMIN sempurna (bukan AI menebak-nebak
// kemiripan 2 foto terpisah).

import sharp from "sharp";

export interface SplitResult {
  left: string; // data URI PNG
  right: string; // data URI PNG
}

function dataUriToBuffer(dataUri: string): { buffer: Buffer; mimeType: string } {
  const match = dataUri.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("dataUri tidak valid");
  return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
}

export async function splitWideImageInHalf(dataUri: string): Promise<SplitResult> {
  const { buffer } = dataUriToBuffer(dataUri);
  // Normalisasi ke PNG dulu (jaga-jaga kalau Gemini balas WEBP — bug lama
  // yang sudah pernah ditemukan di project ini untuk kasus serupa).
  const normalized = await sharp(buffer).png().toBuffer();
  const meta = await sharp(normalized).metadata();
  const width = meta.width ?? 1920;
  const height = meta.height ?? 1080;
  const halfWidth = Math.floor(width / 2);

  const [leftBuffer, rightBuffer] = await Promise.all([
    sharp(normalized).extract({ left: 0, top: 0, width: halfWidth, height }).png().toBuffer(),
    sharp(normalized).extract({ left: width - halfWidth, top: 0, width: halfWidth, height }).png().toBuffer(),
  ]);

  return {
    left: `data:image/png;base64,${leftBuffer.toString("base64")}`,
    right: `data:image/png;base64,${rightBuffer.toString("base64")}`,
  };
}
