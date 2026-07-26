import { describe, expect, it } from "vitest";
import { fitTextForDisplay } from "@/lib/render/fitText";

describe("fitTextForDisplay", () => {
  it("returns the text unchanged when it fits within the estimated budget", () => {
    const result = fitTextForDisplay("Judul pendek", {
      boxWidth: 960,
      fontSize: 64,
      maxLines: 3,
    });

    expect(result).toBe("Judul pendek");
  });

  it("truncates with an ellipsis when the text exceeds the estimated budget", () => {
    const longText = "Lorem ipsum ".repeat(50).trim();

    const result = fitTextForDisplay(longText, {
      boxWidth: 300,
      fontSize: 40,
      maxLines: 2,
    });

    expect(result.length).toBeLessThan(longText.length);
    expect(result.endsWith("…")).toBe(true);
  });

  it("never produces an empty result even for a budget smaller than the ellipsis", () => {
    const result = fitTextForDisplay("abcdefgh", {
      boxWidth: 1,
      fontSize: 100,
      maxLines: 1,
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
