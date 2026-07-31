import { describe, expect, it } from "vitest";
import {
  buildGeneralContentPrompt,
  buildInteraksiContentPrompt,
  buildProdukContentPrompt,
} from "@/lib/ai/autoContentPrompt";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

const profile: BusinessProfile = {
  business: { name: "Kopi Senja", industry: "Kedai kopi", age: "2 tahun", location: "Bandung" },
  offering: {
    mainProducts: "Kopi susu, roti bakar",
    flagshipProduct: "Kopi Susu Senja",
    priceRange: "15rb-30rb",
    targetCustomer: "Anak muda dan pekerja kantoran",
    customerProblem: "Susah cari kedai kopi yang nyaman buat kerja",
  },
  positioning: {
    differentiator: "Suasana homey dan wifi kencang",
    contentGoals: ["jualan", "brand_awareness"],
    tone: "santai",
    cta: "Mampir ke Kopi Senja hari ini",
    avoid: "Jangan bahas kompetitor",
  },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
  logo: null,
};

describe("buildProdukContentPrompt", () => {
  it("includes the business profile context", () => {
    const prompt = buildProdukContentPrompt(profile, "Kopi Susu Senja 250ml");

    expect(prompt).toContain("Kopi Senja");
    expect(prompt).toContain("Anak muda dan pekerja kantoran");
    expect(prompt).toContain("Suasana homey dan wifi kencang");
  });

  it("includes the product description and requires the JSON output shape without imageScene", () => {
    const prompt = buildProdukContentPrompt(profile, "Kopi Susu Senja 250ml");

    expect(prompt).toContain("Kopi Susu Senja 250ml");
    expect(prompt).toContain('{"onImageText": "...", "caption": "..."}');
    expect(prompt).not.toContain("imageScene");
  });

  it("respects the avoid list and tone instructions", () => {
    const prompt = buildProdukContentPrompt(profile, "Kopi Susu Senja 250ml");

    expect(prompt).toContain("Jangan bahas kompetitor");
    expect(prompt).toMatch(/nada brand/i);
  });
});

describe("buildGeneralContentPrompt", () => {
  it("requires onImageText, caption, and imageScene in the JSON output", () => {
    const prompt = buildGeneralContentPrompt(profile);

    expect(prompt).toContain('"onImageText"');
    expect(prompt).toContain('"caption"');
    expect(prompt).toContain('"imageScene"');
  });

  it("does not reference any specific product photo", () => {
    const prompt = buildGeneralContentPrompt(profile);

    expect(prompt).toMatch(/bukan promosi produk spesifik/i);
  });

  it("forbids mentioning text/logo inside the described scene", () => {
    const prompt = buildGeneralContentPrompt(profile);

    expect(prompt).toMatch(/jangan menyebut tulisan, teks, atau logo/i);
  });
});

describe("buildInteraksiContentPrompt", () => {
  it("asks the AI to invent quiz/quote/tips content itself", () => {
    const prompt = buildInteraksiContentPrompt(profile);

    expect(prompt).toMatch(/kuis singkat, quote yang menyentuh, atau tips praktis/i);
  });

  it("requires a question mark and forbids revealing the answer for quiz content", () => {
    const prompt = buildInteraksiContentPrompt(profile);

    expect(prompt).toMatch(/diakhiri tanda tanya/i);
    expect(prompt).toMatch(/jangan membocorkan jawaban benar/i);
  });

  it("asks for an illustration style scene, not a realistic photo", () => {
    const prompt = buildInteraksiContentPrompt(profile);

    expect(prompt).toMatch(/ILUSTRASI lucu\/ceria/);
    expect(prompt).toMatch(/BUKAN foto realistis/);
  });
});
