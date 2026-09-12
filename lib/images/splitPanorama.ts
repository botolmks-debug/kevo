// lib/images/splitPanorama.ts
// Potong 1 foto panorama jadi 2 bagian KOTAK (1:1) — dipakai untuk carousel
// mode Panorama. REVISI PENTING dari versi 3-bagian sebelumnya:
//
// Matematika (ukuran fallback resmi OpenAI "1536x1024", dipakai kalau
// ukuran custom "3240x1080" ditolak server):
// - Dibagi 4: tiap bagian 384px lebar -> cuma 38% dari sisi kotak terisi konten
// - Dibagi 3: tiap bagian 512px lebar -> cuma 50% dari sisi kotak terisi konten
// - Dibagi 2: tiap bagian 768px lebar -> 75% dari sisi kotak terisi konten (JAUH lebih baik)
//
// Slide ke-3 (produk) TIDAK lagi diambil dari bagian panorama yang
// "disisakan kosong" — sekarang dibuat lewat langkah terpisah (foto produk
// asli + bagian ke-2 panorama sebagai referensi gaya), teknik yang SAMA
// dengan mode carousel lain. Ini membebaskan panorama untuk dibagi 2 saja.
//
// Dua arah beda perlu ditangani beda (bukan 1 fit "contain" buta):
// - Kalau bagian LEBIH SEMPIT dari kotak target (kasus fallback): PAD
//   (tambah bantalan warna kiri-kanan) — TIDAK crop, TIDAK menyusutkan.
// - Kalau bagian LEBIH LEBAR dari kotak target (kasus ukuran custom
//   berhasil, mis. 3240/2=1620 > 1080): CROP SEDIKIT kiri-kanan (bukan
//   menyusutkan seluruh gambar) — supaya resolusi & framing tetap penuh,
//   cuma sedikit sisi yang dipangkas.

import sharp from "sharp";
import { applyColorGrade } from "../design/colorGrade";

function dataUriToBuffer(dataUri: string): Buffer {
  const match = dataUri.match(/^data:[^;,]+;base64,(.+)$/);
  if (!match) throw new Error("dataUri tidak valid");
  return Buffer.from(match[1], "base64");
}

export async function splitPanoramaInHalf(dataUri: string): Promise<[string, string]> {
  const raw = dataUriToBuffer(dataUri);
  const normalized = await sharp(raw).png().toBuffer(); // jaga-jaga kalau OpenAI balas WEBP
  const meta = await sharp(normalized).metadata();
  const width = meta.width ?? 1536;
  const height = meta.height ?? 1024;
  const halfWidth = Math.floor(width / 2);
  const targetSize = height; // target KOTAK: sisi = tinggi sumber (1:1)

  // Warna bantalan diambil dari tepi kiri gambar (relevan kalau halfWidth < targetSize).
  const edgeSample = await sharp(normalized)
    .extract({ left: 0, top: 0, width: 4, height })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = edgeSample.data;
  const padColor = { r: r ?? 20, g: g ?? 20, b: b ?? 20, alpha: 1 };

  const buffers = await Promise.all(
    [0, 1].map(async (i) => {
      const left = i === 1 ? width - halfWidth : 0; // bagian kedua ambil sisa persis
      const half = sharp(normalized).extract({ left, top: 0, width: halfWidth, height });

      let squared: Buffer;
      if (halfWidth === targetSize) {
        squared = await half.png().toBuffer(); // sudah pas persis, tidak perlu apa-apa
      } else if (halfWidth > targetSize) {
        // Sedikit LEBIH LEBAR dari kotak -> crop kiri-kanan secukupnya (bukan susutkan semua).
        const overflow = halfWidth - targetSize;
        const cropLeft = Math.floor(overflow / 2);
        squared = await half.extract({ left: cropLeft, top: 0, width: targetSize, height }).png().toBuffer();
      } else {
        // LEBIH SEMPIT dari kotak (kasus fallback) -> pad, tanpa crop sama sekali.
        squared = await half
          .resize({ width: targetSize, height, fit: "contain", background: padColor })
          .png()
          .toBuffer();
      }
      // Color grading ringan ("vibrant") — reuse fungsi yang sudah ada untuk fitur lain.
      return applyColorGrade(squared, "vibrant");
    }),
  );

  return buffers.map((b: Buffer) => `data:image/png;base64,${b.toString("base64")}`) as [string, string];
}
