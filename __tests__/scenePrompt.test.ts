import { describe, expect, it } from "vitest";
import { buildScenePrompt } from "@/lib/ai/scenePrompt";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

const profile: BusinessProfile = {
  business: { name: "Auvo", industry: "Vending machine", age: "3 tahun", location: "Jakarta" },
  offering: {
    mainProducts: "Sewa vending machine",
    flagshipProduct: "Vending machine kopi",
    priceRange: "-",
    targetCustomer: "Kantor modern dan coworking space anak muda",
    customerProblem: "-",
  },
  positioning: {
    differentiator: "Berbagai jenis unit dan support penuh",
    contentGoals: ["brand_awareness"],
    tone: "profesional",
    cta: "Hubungi kami",
    avoid: "",
  },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

describe("buildScenePrompt", () => {
  it("instructs the model to preserve the main object unchanged", () => {
    const prompt = buildScenePrompt(profile);

    expect(prompt).toMatch(/exactly as it is/i);
    expect(prompt).toMatch(/do not redraw/i);
  });

  it("includes the target market so the model can pick a fitting scene", () => {
    const prompt = buildScenePrompt(profile);

    expect(prompt).toContain("Kantor modern dan coworking space anak muda");
  });

  it("includes industry and differentiator as extra context", () => {
    const prompt = buildScenePrompt(profile);

    expect(prompt).toContain("Vending machine");
    expect(prompt).toContain("Berbagai jenis unit dan support penuh");
  });

  it("does not hardcode a fixed scene like a cafe", () => {
    const prompt = buildScenePrompt(profile);

    expect(prompt.toLowerCase()).not.toContain("cafe scene");
    expect(prompt).toMatch(/do not default to a generic cafe/i);
  });
});
