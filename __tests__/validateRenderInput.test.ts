import { describe, expect, it } from "vitest";
import { validateRenderInput } from "@/lib/templates/validateRenderInput";
import { pengumumanTemplate } from "@/lib/templates/pengumuman";

const validValues = { headline: "Judul", body: "Isi pengumuman." };

describe("validateRenderInput", () => {
  it("accepts a well-formed template + values", () => {
    const result = validateRenderInput({
      template: pengumumanTemplate,
      values: validValues,
      ratio: "4:5",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects when template is missing", () => {
    const result = validateRenderInput({ values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/template/i);
    }
  });

  it("rejects when ratio is missing or invalid", () => {
    const result = validateRenderInput({ template: pengumumanTemplate, values: validValues });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/ratio/i);
    }
  });

  it("rejects a text slot with an invalid align value", () => {
    const brokenTemplate = {
      ...pengumumanTemplate,
      layouts: {
        ...pengumumanTemplate.layouts,
        "4:5": {
          ...pengumumanTemplate.layouts["4:5"],
          slots: pengumumanTemplate.layouts["4:5"].slots.map((slot) =>
            slot.id === "headline" ? { ...slot, align: "middle" } : slot,
          ),
        },
      },
    };

    const result = validateRenderInput({ template: brokenTemplate, values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/align/i);
    }
  });

  it("rejects duplicate slot ids", () => {
    const brokenTemplate = {
      ...pengumumanTemplate,
      layouts: {
        ...pengumumanTemplate.layouts,
        "4:5": {
          ...pengumumanTemplate.layouts["4:5"],
          slots: [...pengumumanTemplate.layouts["4:5"].slots, pengumumanTemplate.layouts["4:5"].slots[0]],
        },
      },
    };

    const result = validateRenderInput({ template: brokenTemplate, values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/duplikat/i);
    }
  });

  it("rejects values with a non-string field", () => {
    const result = validateRenderInput({
      template: pengumumanTemplate,
      values: { headline: 123 },
      ratio: "4:5",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    const result = validateRenderInput("not an object");

    expect(result.ok).toBe(false);
  });

  it("accepts a footer with 1 to 3 social entries", () => {
    const template = {
      ...pengumumanTemplate,
      brand: {
        ...pengumumanTemplate.brand,
        footer: { text: "Demo", socials: [{ platformId: "instagram", value: "@demo" }] },
      },
    };

    const result = validateRenderInput({ template, values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(true);
  });

  it("rejects a footer with more than 3 social entries", () => {
    const template = {
      ...pengumumanTemplate,
      brand: {
        ...pengumumanTemplate.brand,
        footer: {
          text: "Demo",
          socials: [
            { platformId: "instagram", value: "@a" },
            { platformId: "whatsapp", value: "@b" },
            { platformId: "facebook", value: "@c" },
            { platformId: "tiktok", value: "@d" },
          ],
        },
      },
    };

    const result = validateRenderInput({ template, values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/maksimal 3/i);
    }
  });

  it("rejects a footer social entry missing platformId or value", () => {
    const template = {
      ...pengumumanTemplate,
      brand: {
        ...pengumumanTemplate.brand,
        footer: { text: "Demo", socials: [{ platformId: "instagram", value: "" }] },
      },
    };

    const result = validateRenderInput({ template, values: validValues, ratio: "4:5" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/value/i);
    }
  });
});
