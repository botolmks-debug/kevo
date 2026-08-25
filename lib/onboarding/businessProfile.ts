import { MAX_SELECTED_SOCIALS } from "@/lib/social/platforms";

export type ContentGoal = "jualan" | "brand_awareness" | "edukasi" | "loyalitas_pelanggan";
export type ToneOfVoice = "santai" | "profesional" | "hangat" | "lucu" | "formal";
// b2c = jual ke konsumen langsung (pemakai akhir); b2b = jual ke sesama pebisnis
// (reseller/toko/perusahaan lain). Bisa dicentang keduanya kalau target pelanggan
// memang campuran. Dipakai AI supaya tidak salah bingkai konten (mis. framing
// "gajian" tidak cocok utk pembeli B2B).
export type CustomerType = "b2c" | "b2b";

export type SocialEntry = { platformId: string; value: string };

// Pojok kanvas tempat logo ditempatkan otomatis di tiap konten yang
// digenerate. Diatur user lewat Dashboard, terpisah dari upload gambar biasa.
export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type BusinessLogo = { url: string; position: LogoPosition };

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
    customerTypes: CustomerType[];
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
  // null = belum upload logo. Diatur lewat /api/business-logo, bukan lewat
  // form onboarding biasa (lihat buildBusinessProfile).
  // logo = versi GELAP (untuk latar terang); logoLight = versi TERANG (untuk
  // latar gelap). Keduanya tersimpan terpisah, tidak saling menimpa.
  logo: BusinessLogo | null;
  logoLight: BusinessLogo | null;
};

export type BusinessProfileDraft = Omit<BusinessProfile, "socials" | "logo" | "logoLight"> & {
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
    logo: null,
    logoLight: null,
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