import { describe, expect, it } from "vitest";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { templates } from "@/lib/templates";
import type { FooterSocial } from "@/lib/templates/types";

const template = templates.find((t) => t.id === "pengumuman")!;

describe("withFooterOverride", () => {
  it("replaces the footer text with the business name", () => {
    const result = withFooterOverride(template, "Klinik Sehat", []);

    expect(result.brand.footer.text).toBe("Klinik Sehat");
  });

  it("falls back to the template's own footer text when business name is empty", () => {
    const result = withFooterOverride(template, "", []);

    expect(result.brand.footer.text).toBe(template.brand.footer.text);
  });

  it("replaces the footer socials list", () => {
    const socials: FooterSocial[] = [{ platformId: "instagram", value: "@klinik" }];

    const result = withFooterOverride(template, "Klinik Sehat", socials);

    expect(result.brand.footer.socials).toEqual(socials);
  });

  it("does not mutate the original template", () => {
    const originalFooter = { ...template.brand.footer };

    withFooterOverride(template, "Klinik Sehat", [{ platformId: "instagram", value: "@klinik" }]);

    expect(template.brand.footer).toEqual(originalFooter);
  });

  it("keeps other brand fields (background color, logo url) unchanged", () => {
    const result = withFooterOverride(template, "Klinik Sehat", []);

    expect(result.brand.backgroundColor).toBe(template.brand.backgroundColor);
    expect(result.brand.logoUrl).toBe(template.brand.logoUrl);
  });
});
