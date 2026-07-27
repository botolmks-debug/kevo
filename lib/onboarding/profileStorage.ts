import type { FooterSocial } from "@/lib/templates/types";
import type { BusinessProfile } from "./businessProfile";

export function buildFooterSocials(profile: BusinessProfile): FooterSocial[] {
  const byPlatformId = new Map(profile.socials.entries.map((entry) => [entry.platformId, entry.value]));
  return profile.socials.selectedPlatformIds
    .map((platformId) => {
      const value = byPlatformId.get(platformId);
      return value ? { platformId, value } : null;
    })
    .filter((entry): entry is FooterSocial => entry !== null);
}
