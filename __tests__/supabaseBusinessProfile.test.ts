import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  businessProfileToRow,
  loadBusinessProfile,
  rowToBusinessProfile,
  saveBusinessProfile,
  type BusinessProfileRow,
} from "@/lib/supabase/businessProfile";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { DEV_BUSINESS_ID } from "@/lib/supabase/devBusiness";

const profile: BusinessProfile = {
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
    contentGoals: ["jualan", "edukasi"],
    tone: "hangat",
    cta: "Daftar via WhatsApp",
    avoid: "Jangan klaim menyembuhkan",
  },
  socials: {
    entries: [{ platformId: "instagram", value: "@klinik" }],
    selectedPlatformIds: ["instagram"],
  },
  story: "Berdiri sejak 2021...",
};

const row: BusinessProfileRow = {
  business_id: DEV_BUSINESS_ID,
  business_name: "Klinik Sehat",
  industry: "Klinik",
  business_age: "3 tahun",
  location: "Bandung",
  main_products: "Konsultasi umum",
  flagship_product: "Medical check-up",
  price_range: "Rp100rb-500rb",
  target_customer: "Keluarga muda",
  customer_problem: "Susah dapat jadwal cepat",
  differentiator: "Dokter berpengalaman",
  content_goals: ["jualan", "edukasi"],
  tone: "hangat",
  cta: "Daftar via WhatsApp",
  avoid: "Jangan klaim menyembuhkan",
  story: "Berdiri sejak 2021...",
  social_entries: [{ platformId: "instagram", value: "@klinik" }],
  selected_social_platform_ids: ["instagram"],
  logo_storage_path: null,
};

describe("businessProfileToRow / rowToBusinessProfile", () => {
  it("maps every field from BusinessProfile into the DB row shape", () => {
    expect(businessProfileToRow(profile, DEV_BUSINESS_ID)).toEqual(row);
  });

  it("maps a DB row back into the exact BusinessProfile shape", () => {
    expect(rowToBusinessProfile(row)).toEqual(profile);
  });

  it("round-trips without losing data", () => {
    expect(rowToBusinessProfile(businessProfileToRow(profile, DEV_BUSINESS_ID))).toEqual(profile);
  });
});

function mockClient(chain: Record<string, unknown>): SupabaseClient {
  return { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
}

describe("saveBusinessProfile", () => {
  it("upserts on conflict business_id and reports success", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = mockClient({ upsert });

    const result = await saveBusinessProfile(client, profile);

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: DEV_BUSINESS_ID, business_name: "Klinik Sehat" }),
      { onConflict: "business_id" },
    );
  });

  it("returns a friendly error instead of throwing when the upsert fails", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "connection refused" } });
    const client = mockClient({ upsert });

    const result = await saveBusinessProfile(client, profile);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("loadBusinessProfile", () => {
  it("returns the mapped profile when a row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = mockClient({ select });

    const result = await loadBusinessProfile(client);

    expect(result).toEqual({ ok: true, profile });
    expect(eq).toHaveBeenCalledWith("business_id", DEV_BUSINESS_ID);
  });

  it("returns profile: null when no row exists yet (not an error)", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = mockClient({ select });

    const result = await loadBusinessProfile(client);

    expect(result).toEqual({ ok: true, profile: null });
  });

  it("returns a friendly error instead of throwing on connection failure", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = mockClient({ select });

    const result = await loadBusinessProfile(client);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});
