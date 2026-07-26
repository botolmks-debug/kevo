import { describe, expect, it } from "vitest";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";

describe("buildRenderInput", () => {
  it("maps each form field to its corresponding template slot", () => {
    const result = buildRenderInput({
      headline: "Judul acara",
      body: "Detail acara.",
      photoUrl: "https://example.com/foto.jpg",
    });

    expect(result.values).toEqual({
      headline: "Judul acara",
      body: "Detail acara.",
      photo: "https://example.com/foto.jpg",
    });
  });

  it("always uses the example announcement template", () => {
    const result = buildRenderInput({ headline: "A", body: "B", photoUrl: "" });

    expect(result.template).toBe(pengumumanTemplate);
  });

  it("passes an empty photo URL through unchanged (no crash, handled by the render engine)", () => {
    const result = buildRenderInput({ headline: "A", body: "B", photoUrl: "" });

    expect(result.values.photo).toBe("");
  });
});
