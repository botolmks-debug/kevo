import { describe, expect, it } from "vitest";
import { validateRenderInput } from "@/lib/templates/validateRenderInput";
import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";

const validValues = { headline: "Judul", body: "Isi pengumuman." };

describe("validateRenderInput", () => {
  it("accepts a well-formed template + values", () => {
    const result = validateRenderInput({
      template: pengumumanTemplate,
      values: validValues,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects when template is missing", () => {
    const result = validateRenderInput({ values: validValues });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/template/i);
    }
  });

  it("rejects a text slot with an invalid align value", () => {
    const brokenTemplate = {
      ...pengumumanTemplate,
      slots: pengumumanTemplate.slots.map((slot) =>
        slot.id === "headline" ? { ...slot, align: "middle" } : slot,
      ),
    };

    const result = validateRenderInput({ template: brokenTemplate, values: validValues });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/align/i);
    }
  });

  it("rejects duplicate slot ids", () => {
    const brokenTemplate = {
      ...pengumumanTemplate,
      slots: [...pengumumanTemplate.slots, pengumumanTemplate.slots[0]],
    };

    const result = validateRenderInput({ template: brokenTemplate, values: validValues });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/duplikat/i);
    }
  });

  it("rejects values with a non-string field", () => {
    const result = validateRenderInput({
      template: pengumumanTemplate,
      values: { headline: 123 },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a completely malformed body", () => {
    const result = validateRenderInput("not an object");

    expect(result.ok).toBe(false);
  });
});
