import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadBusinessProfileMock, saveBusinessProfileMock, createClientMock } = vi.hoisted(() => ({
  loadBusinessProfileMock: vi.fn(),
  saveBusinessProfileMock: vi.fn(),
  createClientMock: vi.fn().mockResolvedValue({ marker: "fake-supabase-client" }),
}));

vi.mock("@/lib/supabase/businessProfile", () => ({
  loadBusinessProfile: loadBusinessProfileMock,
  saveBusinessProfile: saveBusinessProfileMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { GET, POST } from "@/app/api/business-profile/route";

const ORIGINAL_ENV = { ...process.env };

const validProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "3 tahun", location: "Bandung" },
  offering: {
    mainProducts: "Konsultasi umum",
    flagshipProduct: "Medical check-up",
    priceRange: "-",
    targetCustomer: "Keluarga muda",
    customerProblem: "-",
  },
  positioning: {
    differentiator: "Dokter berpengalaman",
    contentGoals: ["jualan"],
    tone: "hangat",
    cta: "Daftar via WhatsApp",
    avoid: "Jangan klaim menyembuhkan",
  },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/business-profile", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/business-profile", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    loadBusinessProfileMock.mockReset();
    createClientMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns a friendly 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toMatch(/supabase/i);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns profile: null when no row exists yet", async () => {
    withSupabaseEnv();
    loadBusinessProfileMock.mockResolvedValue({ ok: true, profile: null });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ profile: null });
  });

  it("returns the profile when a row exists", async () => {
    withSupabaseEnv();
    loadBusinessProfileMock.mockResolvedValue({ ok: true, profile: validProfile });

    const res = await GET();
    const data = await res.json();

    expect(data).toEqual({ profile: validProfile });
  });

  it("returns 502 with a friendly message when the DB read fails", async () => {
    withSupabaseEnv();
    loadBusinessProfileMock.mockResolvedValue({ ok: false, error: "Gagal memuat profil bisnis. Coba lagi." });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});

describe("POST /api/business-profile", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    saveBusinessProfileMock.mockReset();
    createClientMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await POST(postRequest(validProfile));

    expect(res.status).toBe(503);
    expect(saveBusinessProfileMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400 and never calls saveBusinessProfile", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ business: {} }));

    expect(res.status).toBe(400);
    expect(saveBusinessProfileMock).not.toHaveBeenCalled();
  });

  it("saves a well-formed profile and returns ok", async () => {
    withSupabaseEnv();
    saveBusinessProfileMock.mockResolvedValue({ ok: true });

    const res = await POST(postRequest(validProfile));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(saveBusinessProfileMock).toHaveBeenCalledWith(
      { marker: "fake-supabase-client" },
      validProfile,
    );
  });

  it("returns 502 with a friendly message when the DB write fails", async () => {
    withSupabaseEnv();
    saveBusinessProfileMock.mockResolvedValue({ ok: false, error: "Gagal menyimpan profil bisnis. Coba lagi." });

    const res = await POST(postRequest(validProfile));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});
