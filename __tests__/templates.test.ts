import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/render/renderTemplate";
import { validateRenderInput } from "@/lib/templates/validateRenderInput";
import { templates } from "@/lib/templates";
import type { Template } from "@/lib/templates/types";

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

function sampleValuesFor(template: Template): Record<string, string> {
  const values: Record<string, string> = {};
  for (const slot of template.slots) {
    if (slot.type === "text") {
      values[slot.id] = slot.placeholder ?? `Contoh ${slot.id}`;
    }
  }
  return values;
}

describe("10 template dasar", () => {
  it("terdiri dari 10 template dengan id unik", () => {
    const ids = templates.map((t) => t.id);

    expect(ids.length).toBe(10);
    expect(new Set(ids).size).toBe(10);
  });

  it.each(templates)("$name ($id) lolos validasi bentuk Template", (template) => {
    const result = validateRenderInput({ template, values: sampleValuesFor(template) });

    expect(result.ok).toBe(true);
  });

  it.each(templates)(
    "$name ($id) bisa dirender jadi PNG 1080x1350 non-kosong",
    async (template) => {
      const png = await renderTemplate({ template, values: sampleValuesFor(template) });

      expect(isPng(png)).toBe(true);
      expect(png.length).toBeGreaterThan(0);
      const { width, height } = readPngDimensions(png);
      expect(width).toBe(1080);
      expect(height).toBe(1350);
    },
    20000,
  );
});
