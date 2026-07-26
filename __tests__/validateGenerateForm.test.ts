import { describe, expect, it } from "vitest";
import { validateGenerateForm } from "@/app/generate/validateGenerateForm";
import { pengumumanTemplate } from "@/lib/templates/pengumuman";
import { rekrutmenTemplate } from "@/lib/templates/rekrutmen";

describe("validateGenerateForm", () => {
  it("rejects when a required text slot is empty", () => {
    const result = validateGenerateForm(pengumumanTemplate, { headline: "  ", body: "Isi" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/headline/i);
    }
  });

  it("accepts a form with every text slot filled, even with an empty image field", () => {
    const result = validateGenerateForm(pengumumanTemplate, {
      headline: "Judul",
      body: "Isi",
      photo: "",
    });

    expect(result.ok).toBe(true);
  });

  it("names the specific missing field for templates with multiple text slots", () => {
    const result = validateGenerateForm(rekrutmenTemplate, {
      title: "OPEN RECRUITMENT",
      intro: "Ayo bergabung",
      position1: "Admin",
      position2: "",
      position3: "Satpam",
      position4: "Kasir",
      cta: "Hubungi HRD",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/posisi 2/i);
    }
  });
});
