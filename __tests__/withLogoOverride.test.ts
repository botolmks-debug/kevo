import { describe, expect, it } from "vitest";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { templates } from "@/lib/templates";
import type { BusinessLogo } from "@/lib/onboarding/businessProfile";

const template = templates.find((t) => t.id === "pengumuman")!;
// Base logo.size (64) * 10 = 640, well past the 40%-of-canvas cap (432 for a
// 1080-wide canvas) — exercises the capped path.
const cappedSize = Math.floor(Math.min(template.layouts["4:5"].canvas.width, template.layouts["4:5"].canvas.height) * 0.4);

// quote's base logo.size (28) * 10 = 280, under the cap — exercises the
// uncapped "true 10x" path.
const quoteTemplate = templates.find((t) => t.id === "quote")!;

describe("withLogoOverride", () => {
  it("returns the template unchanged when there is no logo", () => {
    expect(withLogoOverride(template, null)).toBe(template);
  });

  it("overrides brand.logoUrl with the business logo", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-left" };

    const result = withLogoOverride(template, logo);

    expect(result.brand.logoUrl).toBe("https://cdn.example/logo.png");
  });

  it("scales the logo to a full 10x when that stays within the canvas-safe cap", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-left" };
    const baseSize = quoteTemplate.layouts["4:5"].logo.size;

    const result = withLogoOverride(quoteTemplate, logo);

    expect(baseSize * 10).toBeLessThan(cappedSize);
    expect(result.layouts["4:5"].logo.size).toBe(baseSize * 10);
  });

  it("caps the scaled logo size at 40% of the canvas's shorter side instead of overflowing", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-left" };
    const baseSize = template.layouts["4:5"].logo.size;

    const result = withLogoOverride(template, logo);

    expect(baseSize * 10).toBeGreaterThan(cappedSize);
    expect(result.layouts["4:5"].logo.size).toBe(cappedSize);
  });

  it("places the logo in the top-left corner with a consistent margin", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-left" };

    const result = withLogoOverride(template, logo);

    expect(result.layouts["4:5"].logo).toEqual({ x: 40, y: 40, size: cappedSize });
  });

  it("places the logo in the top-right corner, flush against the canvas width", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-right" };
    const layout = template.layouts["4:5"];

    const result = withLogoOverride(template, logo);

    expect(result.layouts["4:5"].logo).toEqual({
      x: layout.canvas.width - 40 - cappedSize,
      y: 40,
      size: cappedSize,
    });
  });

  it("places the logo in the bottom-left corner, flush against the canvas height", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "bottom-left" };
    const layout = template.layouts["4:5"];

    const result = withLogoOverride(template, logo);

    expect(result.layouts["4:5"].logo).toEqual({
      x: 40,
      y: layout.canvas.height - 40 - cappedSize,
      size: cappedSize,
    });
  });

  it("places the logo in the bottom-right corner", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "bottom-right" };
    const layout = template.layouts["4:5"];

    const result = withLogoOverride(template, logo);

    expect(result.layouts["4:5"].logo).toEqual({
      x: layout.canvas.width - 40 - cappedSize,
      y: layout.canvas.height - 40 - cappedSize,
      size: cappedSize,
    });
  });

  it("repositions the logo for every aspect ratio, not just the current one", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "top-right" };

    const result = withLogoOverride(template, logo);

    for (const ratio of ["4:5", "1:1", "9:16"] as const) {
      const layout = template.layouts[ratio];
      expect(result.layouts[ratio].logo).toEqual({
        x: layout.canvas.width - 40 - cappedSize,
        y: 40,
        size: cappedSize,
      });
    }
  });

  it("does not mutate the original template", () => {
    const logo: BusinessLogo = { url: "https://cdn.example/logo.png", position: "bottom-right" };
    const originalLogoLayout = { ...template.layouts["4:5"].logo };

    withLogoOverride(template, logo);

    expect(template.layouts["4:5"].logo).toEqual(originalLogoLayout);
  });
});
