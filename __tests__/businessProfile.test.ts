import { describe, expect, it } from "vitest";
import { buildBusinessProfile, toggleSocialSelection } from "@/lib/onboarding/businessProfile";

const draft = {
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
    contentGoals: ["jualan", "edukasi"] as const,
    tone: "hangat" as const,
    cta: "Daftar via WhatsApp",
    avoid: "Jangan klaim menyembuhkan",
  },
  socials: {
    values: { instagram: "@klinik", whatsapp: "+62812", website: "" },
    selectedPlatformIds: ["instagram", "whatsapp", "website"],
  },
  story: "Berdiri sejak 2021...",
};

describe("buildBusinessProfile", () => {
  it("maps every field from the draft into the structured profile", () => {
    const profile = buildBusinessProfile({
      ...draft,
      positioning: { ...draft.positioning, contentGoals: [...draft.positioning.contentGoals] },
    });

    expect(profile.business).toEqual(draft.business);
    expect(profile.offering).toEqual(draft.offering);
    expect(profile.positioning.differentiator).toBe(draft.positioning.differentiator);
    expect(profile.positioning.contentGoals).toEqual(["jualan", "edukasi"]);
    expect(profile.positioning.tone).toBe("hangat");
    expect(profile.story).toBe(draft.story);
  });

  it("drops social entries left empty by the user", () => {
    const profile = buildBusinessProfile({
      ...draft,
      positioning: { ...draft.positioning, contentGoals: [...draft.positioning.contentGoals] },
    });

    expect(profile.socials.entries).toEqual([
      { platformId: "instagram", value: "@klinik" },
      { platformId: "whatsapp", value: "+62812" },
    ]);
  });

  it("drops a selected platform id from the output if it has no filled value", () => {
    const profile = buildBusinessProfile({
      ...draft,
      positioning: { ...draft.positioning, contentGoals: [...draft.positioning.contentGoals] },
    });

    // "website" was selected but left blank, so it can't end up in the footer selection
    expect(profile.socials.selectedPlatformIds).toEqual(["instagram", "whatsapp"]);
  });

  it("caps selectedPlatformIds at 3 even if given more", () => {
    const profile = buildBusinessProfile({
      ...draft,
      socials: {
        values: { instagram: "@a", whatsapp: "@b", facebook: "@c", tiktok: "@d" },
        selectedPlatformIds: ["instagram", "whatsapp", "facebook", "tiktok"],
      },
      positioning: { ...draft.positioning, contentGoals: [...draft.positioning.contentGoals] },
    });

    expect(profile.socials.selectedPlatformIds).toHaveLength(3);
  });
});

describe("toggleSocialSelection", () => {
  it("adds a platform id when under the cap", () => {
    expect(toggleSocialSelection(["instagram"], "whatsapp")).toEqual(["instagram", "whatsapp"]);
  });

  it("removes a platform id already selected", () => {
    expect(toggleSocialSelection(["instagram", "whatsapp"], "instagram")).toEqual(["whatsapp"]);
  });

  it("refuses to select a 4th platform once 3 are selected", () => {
    const selected = ["instagram", "whatsapp", "facebook"];

    expect(toggleSocialSelection(selected, "tiktok")).toEqual(selected);
  });

  it("allows selecting again after deselecting one to make room", () => {
    const threeSelected = ["instagram", "whatsapp", "facebook"];
    const afterDeselect = toggleSocialSelection(threeSelected, "facebook");

    expect(toggleSocialSelection(afterDeselect, "tiktok")).toEqual(["instagram", "whatsapp", "tiktok"]);
  });
});
