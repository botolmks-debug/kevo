import { MAX_SELECTED_SOCIALS } from "@/lib/social/platforms";

export type ContentGoal = "jualan" | "brand_awareness" | "edukasi" | "loyalitas_pelanggan";
export type ToneOfVoice = "santai" | "profesional" | "hangat" | "lucu" | "formal";

export type SocialEntry = { platformId: string; value: string };

export type BusinessProfile = {
  business: {
    name: string;
    industry: string;
    age: string;
    location: string;
  };
  offering: {
    mainProducts: string;
    flagshipProduct: string;
    priceRange: string;
    targetCustomer: string;
    customerProblem: string;
  };
  positioning: {
    differentiator: string;
    contentGoals: ContentGoal[];
    tone: ToneOfVoice | "";
    cta: string;
    avoid: string;
  };
  socials: {
    entries: SocialEntry[];
    selectedPlatformIds: string[];
  };
  story: string;
};

export type BusinessProfileDraft = Omit<BusinessProfile, "socials"> & {
  socials: {
    values: Record<string, string>;
    selectedPlatformIds: string[];
  };
};

export function buildBusinessProfile(draft: BusinessProfileDraft): BusinessProfile {
  const entries = Object.entries(draft.socials.values)
    .filter(([, value]) => value.trim().length > 0)
    .map(([platformId, value]) => ({ platformId, value }));

  const filledIds = new Set(entries.map((entry) => entry.platformId));
  const selectedPlatformIds = draft.socials.selectedPlatformIds
    .filter((id) => filledIds.has(id))
    .slice(0, MAX_SELECTED_SOCIALS);

  return {
    business: draft.business,
    offering: draft.offering,
    positioning: draft.positioning,
    socials: { entries, selectedPlatformIds },
    story: draft.story,
  };
}

export function toggleSocialSelection(selected: string[], platformId: string): string[] {
  if (selected.includes(platformId)) {
    return selected.filter((id) => id !== platformId);
  }
  if (selected.length >= MAX_SELECTED_SOCIALS) {
    return selected;
  }
  return [...selected, platformId];
}
