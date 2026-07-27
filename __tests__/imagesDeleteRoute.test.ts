import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteImageMock, createServiceRoleClientMock } = vi.hoisted(() => ({
  deleteImageMock: vi.fn(),
  createServiceRoleClientMock: vi.fn().mockReturnValue({ marker: "fake-service-role-client" }),
}));

vi.mock("@/lib/supabase/images", () => ({
  deleteImage: deleteImageMock,
}));

vi.mock("@/lib/supabase/serviceRole", () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

import { DELETE } from "@/app/api/images/[id]/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/images/[id]", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    deleteImageMock.mockReset();
    createServiceRoleClientMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 503 without creating a service-role client when the key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await DELETE(new Request("http://localhost/api/images/img-1"), params("img-1"));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toMatch(/service role/i);
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
    expect(deleteImageMock).not.toHaveBeenCalled();
  });

  it("deletes successfully and returns ok", async () => {
    withSupabaseEnv();
    deleteImageMock.mockResolvedValue({ ok: true, storageCleanedUp: true });

    const res = await DELETE(new Request("http://localhost/api/images/img-1"), params("img-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(deleteImageMock).toHaveBeenCalledWith({ marker: "fake-service-role-client" }, "img-1");
  });

  it("returns a friendly 502 when deletion fails", async () => {
    withSupabaseEnv();
    deleteImageMock.mockResolvedValue({ ok: false, error: "Gambar tidak ditemukan." });

    const res = await DELETE(new Request("http://localhost/api/images/missing"), params("missing"));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toBe("Gambar tidak ditemukan.");
  });
});
