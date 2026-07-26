import { describe, expect, it } from "vitest";
import { validateGenerateForm } from "@/app/generate/validateGenerateForm";

describe("validateGenerateForm", () => {
  it("rejects an empty headline", () => {
    const result = validateGenerateForm({ headline: "  ", body: "Isi", photoUrl: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/headline/i);
    }
  });

  it("rejects an empty body", () => {
    const result = validateGenerateForm({ headline: "Judul", body: "   ", photoUrl: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/isi/i);
    }
  });

  it("accepts a form with headline and body filled, even with no photo URL", () => {
    const result = validateGenerateForm({ headline: "Judul", body: "Isi", photoUrl: "" });

    expect(result.ok).toBe(true);
  });
});
