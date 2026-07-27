import { describe, expect, it } from "vitest";
import { SocialIcon } from "@/lib/social/icons";
import { SOCIAL_PLATFORMS } from "@/lib/social/platforms";

function isSvgElement(node: unknown): node is { type: string; props: Record<string, unknown> } {
  return typeof node === "object" && node !== null && "type" in node && "props" in node;
}

describe("SocialIcon", () => {
  it.each(SOCIAL_PLATFORMS)("renders an inline svg icon for $label ($id)", ({ id }) => {
    const element = SocialIcon({ platformId: id, size: 40 });

    expect(isSvgElement(element)).toBe(true);
    if (isSvgElement(element)) {
      expect(element.type).toBe("svg");
      expect(element.props.width).toBe(40);
      expect(element.props.height).toBe(40);
      expect(element.props.children).toBeTruthy();
    }
  });

  it("falls back to a generic monogram instead of crashing for an unknown platform id", () => {
    const element = SocialIcon({ platformId: "some-future-platform", size: 32 });

    expect(isSvgElement(element)).toBe(true);
    if (isSvgElement(element)) {
      expect(element.type).toBe("svg");
      expect(element.props.width).toBe(32);
    }
  });
});
