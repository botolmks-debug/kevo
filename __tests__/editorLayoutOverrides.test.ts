import { describe, expect, it } from "vitest";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { templates } from "@/lib/templates";

const template = templates.find((t) => t.id === "pengumuman")!;

describe("applyEditorOverrides", () => {
  it("returns the template unchanged when there are no overrides", () => {
    const result = applyEditorOverrides(template, "4:5", { slots: {} });

    expect(result).toEqual(template);
  });

  it("overrides only the box of the targeted text slot, leaving other fields intact", () => {
    const textSlot = template.layouts["4:5"].slots.find((s) => s.type === "text")!;
    const overrides: EditorOverrides = {
      slots: { [textSlot.id]: { box: { x: 10, y: 20, width: 300, height: 80 } } },
    };

    const result = applyEditorOverrides(template, "4:5", overrides);
    const updatedSlot = result.layouts["4:5"].slots.find((s) => s.id === textSlot.id)!;

    expect(updatedSlot.box).toEqual({ x: 10, y: 20, width: 300, height: 80 });
    expect((updatedSlot as typeof textSlot).fontFamily).toBe((textSlot as typeof textSlot).fontFamily);
  });

  it("overrides fontFamily, fontWeight, color, and align together", () => {
    const textSlot = template.layouts["4:5"].slots.find((s) => s.type === "text")!;
    const overrides: EditorOverrides = {
      slots: {
        [textSlot.id]: { fontFamily: "Pacifico", fontWeight: 700, color: "#ff0000", align: "center" },
      },
    };

    const result = applyEditorOverrides(template, "4:5", overrides);
    const updatedSlot = result.layouts["4:5"].slots.find((s) => s.id === textSlot.id) as typeof textSlot;

    expect(updatedSlot.fontFamily).toBe("Pacifico");
    expect(updatedSlot.fontWeight).toBe(700);
    expect(updatedSlot.color).toBe("#ff0000");
    expect(updatedSlot.align).toBe("center");
  });

  it("does not touch image slots even if an override key matches their id", () => {
    const imageSlot = template.layouts["4:5"].slots.find((s) => s.type === "image");
    if (!imageSlot) return; // template ini mungkin tidak punya slot gambar

    const overrides: EditorOverrides = {
      slots: { [imageSlot.id]: { fontFamily: "Pacifico" } },
    };

    const result = applyEditorOverrides(template, "4:5", overrides);
    const updated = result.layouts["4:5"].slots.find((s) => s.id === imageSlot.id);

    expect(updated).toEqual(imageSlot);
  });

  it("overrides only the footer position (x/y), leaving other footer fields intact", () => {
    const overrides: EditorOverrides = { slots: {}, footer: { x: 111, y: 222 } };

    const result = applyEditorOverrides(template, "4:5", overrides);

    expect(result.layouts["4:5"].footerLayout.x).toBe(111);
    expect(result.layouts["4:5"].footerLayout.y).toBe(222);
    expect(result.layouts["4:5"].footerLayout.direction).toBe(template.layouts["4:5"].footerLayout.direction);
    expect(result.layouts["4:5"].footerLayout.iconSize).toBe(template.layouts["4:5"].footerLayout.iconSize);
  });

  it("only affects the given ratio, leaving other ratios untouched", () => {
    const textSlot = template.layouts["4:5"].slots.find((s) => s.type === "text")!;
    const overrides: EditorOverrides = {
      slots: { [textSlot.id]: { box: { x: 10, y: 20, width: 300, height: 80 } } },
    };

    const result = applyEditorOverrides(template, "4:5", overrides);

    expect(result.layouts["1:1"]).toEqual(template.layouts["1:1"]);
    expect(result.layouts["9:16"]).toEqual(template.layouts["9:16"]);
  });

  it("does not mutate the original template", () => {
    const textSlot = template.layouts["4:5"].slots.find((s) => s.type === "text")!;
    const originalBox = { ...textSlot.box };
    const overrides: EditorOverrides = {
      slots: { [textSlot.id]: { box: { x: 999, y: 999, width: 999, height: 999 } } },
    };

    applyEditorOverrides(template, "4:5", overrides);

    const stillOriginal = template.layouts["4:5"].slots.find((s) => s.id === textSlot.id)!;
    expect(stillOriginal.box).toEqual(originalBox);
  });
});
