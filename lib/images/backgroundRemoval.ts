import sharp from "sharp";

// Jarak warna RGB (0-441) di bawah ini dianggap "masih background".
const COLOR_DISTANCE_THRESHOLD = 24;

type RawImage = { data: Buffer; width: number; height: number };

async function toRawRgba(input: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function averageBorderColor(image: RawImage): [number, number, number] {
  const { data, width, height } = image;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  function accumulate(x: number, y: number) {
    const idx = (y * width + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
    count++;
  }

  for (let x = 0; x < width; x++) {
    accumulate(x, 0);
    accumulate(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    accumulate(0, y);
    accumulate(width - 1, y);
  }

  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Hapus background polos (satu warna dominan) dari logo — deterministik,
 * tanpa AI. Warna latar diperkirakan dari rata-rata piksel di tepi gambar,
 * lalu flood-fill dari tepi ke arah dalam menghapus (transparan) area yang
 * warnanya masih dekat dengan itu, berhenti begitu bertemu warna yang beda
 * jauh (logo). Area berwarna serupa background tapi TIDAK tersambung ke
 * tepi (mis. lubang di tengah huruf) sengaja dibiarkan — bukan bagian
 * background yang mau dihapus.
 */
export async function removeSolidBackground(input: Buffer): Promise<Buffer> {
  const image = await toRawRgba(input);
  const { data, width, height } = image;
  const [bgR, bgG, bgB] = averageBorderColor(image);

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function maybeEnqueue(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;
    const idx = pixelIndex * 4;
    const distance = colorDistance(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
    if (distance > COLOR_DISTANCE_THRESHOLD) return;
    visited[pixelIndex] = 1;
    data[idx + 3] = 0;
    queue.push(pixelIndex);
  }

  for (let x = 0; x < width; x++) {
    maybeEnqueue(x, 0);
    maybeEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    maybeEnqueue(0, y);
    maybeEnqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const pixelIndex = queue.pop()!;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    maybeEnqueue(x - 1, y);
    maybeEnqueue(x + 1, y);
    maybeEnqueue(x, y - 1);
    maybeEnqueue(x, y + 1);
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Chroma-key untuk background MAGENTA (dipakai setelah Gemini mengganti seluruh
 * latar dengan magenta solid). Lebih tahan gradasi/noise daripada
 * removeSolidBackground: sebuah piksel dianggap MAGENTA bila kanal HIJAU jauh
 * di bawah MERAH dan BIRU. Penghapusan bersifat global (bukan flood-fill dari
 * tepi) sehingga magenta yang menembus produk transparan pun ikut hilang.
 * Sekaligus de-spill: menetralkan semburat magenta tipis di tepi produk.
 */
export async function removeChromaBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const KEY = 45; // G + KEY < R && G + KEY < B → magenta penuh → transparan
  const SPILL = 14; // ambang lebih longgar untuk membersihkan semburat tepi
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g + KEY < r && g + KEY < b && r > 70 && b > 70) {
      data[i + 3] = 0; // magenta → transparan
    } else if (g + SPILL < r && g + SPILL < b) {
      // Tepi keunguan: turunkan R & B mendekati G agar semburat magenta hilang.
      const cap = g + SPILL;
      if (data[i] > cap) data[i] = cap;
      if (data[i + 2] > cap) data[i + 2] = cap;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
