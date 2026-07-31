import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { removeLogoBackgroundMock, createClientMock } = vi.hoisted(() => ({
  removeLogoBackgroundMock: vi.fn(),
  createClientMock: vi.fn().mockResolvedValue({ marker: "fake-supabase-client" }),
}));

vi.mock("@/lib/supabase/logo", () => ({
  removeLogoBackground: removeLogoBackgroundMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { POST } from "@/app/api/business-logo/remove-background/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  removeLogoBackgroundMock.mockReset();
  createClientMock.mockClear();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/business-logo/remove-background", () => {
  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST();

    expect(res.status).toBe(503);
    expect(removeLogoBackgroundMock).not.toHaveBeenCalled();
  });

  it("processes successfully and returns the new url", async () => {
    withSupabaseEnv();
    removeLogoBackgroundMock.mockResolvedValue({ ok: true, url: "https://cdn.example/dev/logo/clean.png" });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe("https://cdn.example/dev/logo/clean.png");
    expect(removeLogoBackgroundMock).toHaveBeenCalledWith({ marker: "fake-supabase-client" });
  });

  it("returns 502 with a friendly message when processing fails", async () => {
    withSupabaseEnv();
    removeLogoBackgroundMock.mockResolvedValue({ ok: false, error: "Belum ada logo untuk dihapus background-nya." });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/logo/i);
  });
});
