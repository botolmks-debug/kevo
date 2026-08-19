// sharp dimuat DINAMIS di tiap fungsi — mencegah crash module saat startup
// di Vercel (binary Linux tidak ditemukan saat module-level import).

// Jarak warna RGB (0-441) di bawah ini dianggap "masih background".
const COLOR_DISTANCE_THRESHOLD = 24;

type RawImage = { data: Buffer; width: number; height: number };

async function toRawRgba(input: Buffer): Promise<RawImage> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function averageBorderColor(image: RawImage): [number, number, number] {
  const { data, width, height } = image;
  let r = 0, g = 0, b = 0, count = 0;

  function accumulate(x: number, y: number) {
    const idx = (y * width + x) * 4;
    r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
  }

  for (let x = 0; x < width; x++) { accumulate(x, 0); accumulate(x, height - 1); }
  for (let y = 0; y < height; y++) { accumulate(0, y); accumulate(width - 1, y); }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export async function removeSolidBackground(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
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

  for (let x = 0; x < width; x++) { maybeEnqueue(x, 0); maybeEnqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { maybeEnqueue(0, y); maybeEnqueue(width - 1, y); }

  while (queue.length > 0) {
    const pixelIndex = queue.pop()!;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    maybeEnqueue(x - 1, y); maybeEnqueue(x + 1, y);
    maybeEnqueue(x, y - 1); maybeEnqueue(x, y + 1);
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export async function removeChromaBackground(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const KEY = 45;
  const SPILL = 14;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g + KEY < r && g + KEY < b && r > 70 && b > 70) {
      data[i + 3] = 0;
    } else if (g + SPILL < r && g + SPILL < b) {
      const cap = g + SPILL;
      if (data[i] > cap) data[i] = cap;
      if (data[i + 2] > cap) data[i + 2] = cap;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
