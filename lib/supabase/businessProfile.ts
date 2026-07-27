import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessProfile, ContentGoal, ToneOfVoice } from "@/lib/onboarding/businessProfile";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";

export type BusinessProfileRow = {
  business_id: string;
  business_name: string;
  industry: string;
  business_age: string;
  location: string;
  main_products: string;
  flagship_product: string;
  price_range: string;
  target_customer: string;
  customer_problem: string;
  differentiator: string;
  content_goals: string[];
  tone: string;
  cta: string;
  avoid: string;
  story: string;
  social_entries: { platformId: string; value: string }[];
  selected_social_platform_ids: string[];
  logo_storage_path: string | null;
};

export function businessProfileToRow(
  profile: BusinessProfile,
  businessId: string = DEV_BUSINESS_ID,
): BusinessProfileRow {
  return {
    business_id: businessId,
    business_name: profile.business.name,
    industry: profile.business.industry,
    business_age: profile.business.age,
    location: profile.business.location,
    main_products: profile.offering.mainProducts,
    flagship_product: profile.offering.flagshipProduct,
    price_range: profile.offering.priceRange,
    target_customer: profile.offering.targetCustomer,
    customer_problem: profile.offering.customerProblem,
    differentiator: profile.positioning.differentiator,
    content_goals: profile.positioning.contentGoals,
    tone: profile.positioning.tone,
    cta: profile.positioning.cta,
    avoid: profile.positioning.avoid,
    story: profile.story,
    social_entries: profile.socials.entries,
    selected_social_platform_ids: profile.socials.selectedPlatformIds,
    logo_storage_path: null,
  };
}

export function rowToBusinessProfile(row: BusinessProfileRow): BusinessProfile {
  return {
    business: {
      name: row.business_name,
      industry: row.industry,
      age: row.business_age,
      location: row.location,
    },
    offering: {
      mainProducts: row.main_products,
      flagshipProduct: row.flagship_product,
      priceRange: row.price_range,
      targetCustomer: row.target_customer,
      customerProblem: row.customer_problem,
    },
    positioning: {
      differentiator: row.differentiator,
      contentGoals: row.content_goals as ContentGoal[],
      tone: row.tone as ToneOfVoice | "",
      cta: row.cta,
      avoid: row.avoid,
    },
    socials: {
      entries: row.social_entries,
      selectedPlatformIds: row.selected_social_platform_ids,
    },
    story: row.story,
  };
}

export type SaveBusinessProfileResult = { ok: true } | { ok: false; error: string };

export async function saveBusinessProfile(
  client: SupabaseClient,
  profile: BusinessProfile,
  businessId: string = DEV_BUSINESS_ID,
): Promise<SaveBusinessProfileResult> {
  const row = businessProfileToRow(profile, businessId);
  const { error } = await client
    .from("business_profile")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "business_id" });

  if (error) {
    console.error(`saveBusinessProfile failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal menyimpan profil bisnis. Coba lagi." };
  }
  return { ok: true };
}

export type LoadBusinessProfileResult =
  | { ok: true; profile: BusinessProfile | null }
  | { ok: false; error: string };

export async function loadBusinessProfile(
  client: SupabaseClient,
  businessId: string = DEV_BUSINESS_ID,
): Promise<LoadBusinessProfileResult> {
  const { data, error } = await client
    .from("business_profile")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error(`loadBusinessProfile failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal memuat profil bisnis. Coba lagi." };
  }
  if (!data) {
    return { ok: true, profile: null };
  }
  return { ok: true, profile: rowToBusinessProfile(data as BusinessProfileRow) };
}
