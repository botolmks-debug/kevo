import { describe, expect, it } from "vitest";
import { buildCaptionPrompt } from "@/lib/ai/captionPrompt";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

const profile: BusinessProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "3 tahun", location: "Bandung" },
  offering: {
    mainProducts: "Konsultasi umum",
    flagshipProduct: "Medical check-up",
    priceRange: "Rp100rb-500rb",
    targetCustomer: "Keluarga muda",
    customerProblem: "Susah dapat jadwal cepat",
  },
  positioning: {
    differentiator: "Dokter berpengalaman",
    contentGoals: ["jualan", "edukasi"],
    tone: "hangat",
    cta: "Daftar via WhatsApp",
    avoid: "Jangan klaim menyembuhkan penyakit apapun",
  },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "Berdiri sejak 2021...",
  logo: null,
};

describe("buildCaptionPrompt", () => {
  it("includes the brand tone from the profile", () => {
    const prompt = buildCaptionPrompt(profile, { templateName: "Pengumuman", values: {} });

    expect(prompt).toContain("hangat");
  });

  it("includes the must-avoid guidance from the profile", () => {
    const prompt = buildCaptionPrompt(profile, { templateName: "Pengumuman", values: {} });

    expect(prompt).toContain("Jangan klaim menyembuhkan penyakit apapun");
  });

  it("includes the differentiator, CTA, and content goals", () => {
    const prompt = buildCaptionPrompt(profile, { templateName: "Pengumuman", values: {} });

    expect(prompt).toContain("Dokter berpengalaman");
    expect(prompt).toContain("Daftar via WhatsApp");
    expect(prompt).toContain("jualan/penjualan");
    expect(prompt).toContain("edukasi");
  });

  it("includes the content values being generated", () => {
    const prompt = buildCaptionPrompt(profile, {
      templateName: "Pengumuman",
      values: { Headline: "Promo Vaksinasi Anak" },
    });

    expect(prompt).toContain("Pengumuman");
    expect(prompt).toContain("Headline: Promo Vaksinasi Anak");
  });

  it("instructs the model to vary the opening line instead of a fixed cliche", () => {
    const prompt = buildCaptionPrompt(profile, { templateName: "Pengumuman", values: {} });

    expect(prompt).toMatch(/variasikan/i);
  });
});
