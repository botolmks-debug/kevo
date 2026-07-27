import { describe, expect, it } from "vitest";
import { renderFooterSocials } from "@/lib/render/renderFooter";
import { SocialIcon } from "@/lib/social/icons";
import type { FooterSocial, SocialFooterLayout } from "@/lib/templates/types";

const rowLayout: SocialFooterLayout = {
  x: 60,
  y: 1200,
  direction: "row",
  gap: 20,
  iconSize: 40,
  textSize: 22,
  textColor: "#ffffff",
  nameColor: "#ffffff",
};

const fourSocials: FooterSocial[] = [
  { platformId: "instagram", value: "@a" },
  { platformId: "whatsapp", value: "@b" },
  { platformId: "facebook", value: "@c" },
  { platformId: "tiktok", value: "@d" },
];

type Entry = { props: { children: [unknown, { props: { children: string } }] } };

describe("renderFooterSocials", () => {
  it("never renders more than 3 entries even if given more", () => {
    const element = renderFooterSocials(fourSocials, rowLayout);
    const children = element.props.children as unknown[];

    expect(children).toHaveLength(3);
  });

  it("renders an icon + the handle text for each visible entry", () => {
    const element = renderFooterSocials(fourSocials.slice(0, 1), rowLayout);
    const [entry] = element.props.children as Entry[];
    const [icon, handle] = entry.props.children;

    expect((icon as { type: unknown; props: { platformId: string; size: number } }).type).toBe(SocialIcon);
    expect((icon as { props: { platformId: string; size: number } }).props).toMatchObject({
      platformId: "instagram",
      size: rowLayout.iconSize,
    });
    expect(handle.props.children).toBe("@a");
  });

  it("stacks entries horizontally when direction is row", () => {
    const element = renderFooterSocials(fourSocials, rowLayout);

    expect(element.props.style.flexDirection).toBe("row");
  });

  it("stacks entries vertically when direction is column", () => {
    const element = renderFooterSocials(fourSocials, { ...rowLayout, direction: "column" });

    expect(element.props.style.flexDirection).toBe("column");
  });
});
