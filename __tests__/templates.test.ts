import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/render/renderTemplate";
import { validateRenderInput } from "@/lib/templates/validateRenderInput";
import { templates } from "@/lib/templates";
import type { AspectRatio, Template } from "@/lib/templates/types";

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
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const RATIO_CANVAS: Record<AspectRatio, { width: number; height: number }> = {
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};
const RATIOS = Object.keys(RATIO_CANVAS) as AspectRatio[];

function sampleValuesFor(template: Template, ratio: AspectRatio): Record<string, string> {
  const values: Record<string, string> = {};
  for (const slot of template.layouts[ratio].slots) {
    if (slot.type === "text") {
      values[slot.id] = slot.placeholder ?? `Contoh ${slot.id}`;
    }
  }
  return values;
}

describe("10 template dasar", () => {
  it("terdiri dari 11 template (10 desain + Tanpa Template) dengan id unik", () => {
    const ids = templates.map((t) => t.id);

    expect(ids.length).toBe(11);
    expect(new Set(ids).size).toBe(11);
  });

  it.each(templates)("$name ($id) lolos validasi bentuk Template untuk semua rasio", (template) => {
    for (const ratio of RATIOS) {
      const result = validateRenderInput({
        template,
        values: sampleValuesFor(template, ratio),
        ratio,
      });

      expect(result.ok).toBe(true);
    }
  });

  const renderCases = templates.flatMap((template) => RATIOS.map((ratio) => ({ template, ratio })));

  it.each(renderCases)(
    "$template.name ($template.id) rasio $ratio bisa dirender jadi PNG sesuai kanvas",
    async ({ template, ratio }) => {
      const png = await renderTemplate({ template, values: sampleValuesFor(template, ratio), ratio });

      expect(isPng(png)).toBe(true);
      expect(png.length).toBeGreaterThan(0);
      const { width, height } = readPngDimensions(png);
      expect(width).toBe(RATIO_CANVAS[ratio].width);
      expect(height).toBe(RATIO_CANVAS[ratio].height);
    },
    20000,
  );
});
