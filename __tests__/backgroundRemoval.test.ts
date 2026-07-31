import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { removeSolidBackground } from "@/lib/images/backgroundRemoval";

async function buildPng(width: number, height: number, colorAt: (x: number, y: number) => [number, number, number]): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colorAt(x, y);
      const idx = (y * width + x) * 3;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function readRawRgba(buffer: Buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function alphaAt(raw: { data: Buffer; width: number }, x: number, y: number): number {
  const idx = (y * raw.width + x) * 4;
  return raw.data[idx + 3];
}

function rgbAt(raw: { data: Buffer; width: number }, x: number, y: number): [number, number, number] {
  const idx = (y * raw.width + x) * 4;
  return [raw.data[idx], raw.data[idx + 1], raw.data[idx + 2]];
}

const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [220, 20, 20];

describe("removeSolidBackground", () => {
  it("makes a solid white background transparent while keeping a contrasting center shape opaque", async () => {
    const input = await buildPng(20, 20, (x, y) => (x >= 8 && x < 12 && y >= 8 && y < 12 ? RED : WHITE));

    const output = await removeSolidBackground(input);
    const raw = await readRawRgba(output);

    expect(alphaAt(raw, 0, 0)).toBe(0);
    expect(alphaAt(raw, 19, 19)).toBe(0);
    expect(alphaAt(raw, 10, 10)).toBe(255);
    expect(rgbAt(raw, 10, 10)).toEqual(RED);
  });

  it("does not touch a background-colored region that is enclosed by the logo, not connected to the border", async () => {
    // A red "ring" (rows/cols 4-15) with a small white "hole" in the middle
    // (rows/cols 9-10) that never touches the image edge.
    const input = await buildPng(20, 20, (x, y) => {
      const inRing = x >= 4 && x < 16 && y >= 4 && y < 16;
      const inHole = x >= 9 && x < 11 && y >= 9 && y < 11;
      if (inHole) return WHITE;
      if (inRing) return RED;
      return WHITE;
    });

    const output = await removeSolidBackground(input);
    const raw = await readRawRgba(output);

    expect(alphaAt(raw, 0, 0)).toBe(0); // outer background removed
    expect(alphaAt(raw, 5, 5)).toBe(255); // ring itself untouched
    expect(alphaAt(raw, 9, 9)).toBe(255); // enclosed hole, same color as background, left alone
  });

  it("removes the entire image when it is a single uniform color (no distinct subject)", async () => {
    const input = await buildPng(10, 10, () => WHITE);

    const output = await removeSolidBackground(input);
    const raw = await readRawRgba(output);

    expect(alphaAt(raw, 5, 5)).toBe(0);
  });
});
