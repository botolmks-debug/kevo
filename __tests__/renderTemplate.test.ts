import { afterEach, describe, expect, it, vi } from "vitest";
import { loadImageAsDataUri, renderTemplate } from "@/lib/render/renderTemplate";
import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";
import type { RenderInput } from "@/lib/templates/types";

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const baseInput: RenderInput = {
  template: pengumumanTemplate,
  values: {
    headline: "Pengumuman penting untuk seluruh warga sekolah tahun ajaran baru",
    body: "Silakan hubungi kantor untuk info lebih lanjut mengenai jadwal dan lokasi kegiatan.",
  },
};

describe("renderTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("produces a valid PNG with dimensions matching the template canvas", async () => {
    const png = await renderTemplate(baseInput);

    expect(isPng(png)).toBe(true);
    const { width, height } = readPngDimensions(png);
    expect(width).toBe(pengumumanTemplate.canvas.width);
    expect(height).toBe(pengumumanTemplate.canvas.height);
  }, 20000);

  it("is deterministic for the same input", async () => {
    const first = await renderTemplate(baseInput);
    const second = await renderTemplate(baseInput);

    expect(first.equals(second)).toBe(true);
  }, 30000);

  it("renders successfully even when an optional image slot has no value", async () => {
    const input: RenderInput = {
      template: pengumumanTemplate,
      values: { headline: "Judul singkat", body: "Isi singkat." },
    };

    const png = await renderTemplate(input);

    expect(isPng(png)).toBe(true);
  }, 20000);

  it("falls back to a placeholder instead of throwing when an image URL is unreachable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    const input: RenderInput = {
      template: pengumumanTemplate,
      values: { ...baseInput.values, photo: "https://example.com/broken.jpg" },
    };

    const png = await renderTemplate(input);

    expect(isPng(png)).toBe(true);
  }, 20000);

  it("does not treat a non-image response as an image", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html>bukan gambar</html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    const result = await loadImageAsDataUri("https://example.com");

    expect(result).toBeNull();
  });

  it("falls back to a placeholder instead of throwing when a URL resolves but isn't an image (regression: reported as 'a is not iterable')", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html>bukan gambar</html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    const input: RenderInput = {
      template: pengumumanTemplate,
      values: { ...baseInput.values, photo: "https://example.com" },
    };

    const png = await renderTemplate(input);

    expect(isPng(png)).toBe(true);
  }, 20000);
});
