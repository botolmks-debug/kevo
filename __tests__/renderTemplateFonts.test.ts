import { describe, expect, it } from "vitest";
import { loadFontBuffers, renderTemplate } from "@/lib/render/renderTemplate";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import { polosTemplate } from "@/lib/templates/polos";

describe("loadFontBuffers", () => {
  it("loads Inter plus all 9 extra font options as non-empty buffers", () => {
    const fonts = loadFontBuffers();

    expect(fonts.regular.length).toBeGreaterThan(0);
    expect(fonts.bold.length).toBeGreaterThan(0);

    const extraFamilies = FONT_OPTIONS.filter((f) => f.id !== "inter").map((f) => f.family);
    expect(fonts.extra.map((f) => f.family).sort()).toEqual(extraFamilies.sort());
    for (const font of fonts.extra) {
      expect(font.data.length).toBeGreaterThan(0);
    }
  });
});

describe("renderTemplate with a non-Inter font", () => {
  it("renders a valid PNG when a text slot uses one of the extra registered fonts", async () => {
    const nonInterFont = FONT_OPTIONS.find((f) => f.id !== "inter");
    expect(nonInterFont).toBeDefined();

    const template = {
      ...polosTemplate,
      layouts: {
        ...polosTemplate.layouts,
        "1:1": {
          ...polosTemplate.layouts["1:1"],
          slots: polosTemplate.layouts["1:1"].slots.map((slot) =>
            slot.id === "caption" ? { ...slot, fontFamily: nonInterFont!.family } : slot,
          ),
        },
      },
    };

    const png = await renderTemplate({
      template,
      values: { caption: "Uji font baru" },
      ratio: "1:1",
    });

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });
});
