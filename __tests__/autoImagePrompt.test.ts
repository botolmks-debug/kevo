import { describe, expect, it } from "vitest";
import { buildGeneralImagePrompt, buildInteraksiImagePrompt } from "@/lib/ai/autoImagePrompt";

describe("buildGeneralImagePrompt", () => {
  it("asks for a realistic editorial photo, not an illustration", () => {
    const prompt = buildGeneralImagePrompt("orang menyeruput kopi di teras pagi hari");

    expect(prompt).toMatch(/foto editorial realistis/i);
    expect(prompt).toMatch(/BUKAN ilustrasi atau kartun/);
  });

  it("includes the AI-decided scene text", () => {
    const prompt = buildGeneralImagePrompt("orang menyeruput kopi di teras pagi hari");

    expect(prompt).toContain("orang menyeruput kopi di teras pagi hari");
  });

  it("forbids adding text/logo and asks for full-bleed composition", () => {
    const prompt = buildGeneralImagePrompt("suasana kedai kopi ramai");

    expect(prompt).toMatch(/full-bleed/i);
    expect(prompt).toMatch(/jangan menambahkan tulisan, huruf, angka, watermark, atau logo/i);
  });
});

describe("buildInteraksiImagePrompt", () => {
  it("asks for a cheerful illustration, not a realistic photo", () => {
    const prompt = buildInteraksiImagePrompt("kemasan kopi tersenyum sambil mengangkat cangkir");

    expect(prompt).toMatch(/ilustrasi digital yang lucu dan ceria/i);
    expect(prompt).toMatch(/BUKAN foto realistis/);
  });

  it("includes the AI-decided scene text", () => {
    const prompt = buildInteraksiImagePrompt("kemasan kopi tersenyum sambil mengangkat cangkir");

    expect(prompt).toContain("kemasan kopi tersenyum sambil mengangkat cangkir");
  });

  it("leaves the bottom third simple for the text overlay/scrim", () => {
    const prompt = buildInteraksiImagePrompt("apa saja");

    expect(prompt).toMatch(/sepertiga tinggi gambar akan ditutup lapisan gelap tipis berisi teks/i);
  });
});
