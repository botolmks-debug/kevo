import { describe, expect, it } from "vitest";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { pengumumanTemplate } from "@/lib/templates/pengumuman";

describe("buildRenderInput", () => {
  it("pairs the selected template with the given values unchanged", () => {
    const values = { headline: "Judul acara", body: "Detail acara.", photo: "" };

    const result = buildRenderInput(pengumumanTemplate, values);

    expect(result.template).toBe(pengumumanTemplate);
    expect(result.values).toEqual(values);
  });

  it("passes an empty image field through unchanged (handled by the render engine)", () => {
    const result = buildRenderInput(pengumumanTemplate, {
      headline: "A",
      body: "B",
      photo: "",
    });

    expect(result.values.photo).toBe("");
  });
});
