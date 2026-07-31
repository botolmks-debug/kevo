import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { uploadLogoMock, deleteLogoMock, updateLogoPositionMock, createClientMock, createServiceRoleClientMock } =
  vi.hoisted(() => ({
    uploadLogoMock: vi.fn(),
    deleteLogoMock: vi.fn(),
    updateLogoPositionMock: vi.fn(),
    createClientMock: vi.fn().mockResolvedValue({ marker: "fake-supabase-client" }),
    createServiceRoleClientMock: vi.fn().mockReturnValue({ marker: "fake-service-role-client" }),
  }));

vi.mock("@/lib/supabase/logo", () => ({
  uploadLogo: uploadLogoMock,
  deleteLogo: deleteLogoMock,
  updateLogoPosition: updateLogoPositionMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/serviceRole", () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

import { POST, PATCH, DELETE } from "@/app/api/business-logo/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
}

function fakeFile(name = "logo.png"): File {
  return new File(["dummy"], name, { type: "image/png" });
}

function postRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/business-logo", { method: "POST", body: formData });
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/business-logo", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  uploadLogoMock.mockReset();
  deleteLogoMock.mockReset();
  updateLogoPositionMock.mockReset();
  createClientMock.mockClear();
  createServiceRoleClientMock.mockClear();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/business-logo", () => {
  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(postRequest({ file: fakeFile() }));

    expect(res.status).toBe(503);
    expect(uploadLogoMock).not.toHaveBeenCalled();
  });

  it("rejects when the file is missing", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({}));

    expect(res.status).toBe(400);
    expect(uploadLogoMock).not.toHaveBeenCalled();
  });

  it("uploads successfully and returns the public url", async () => {
    withSupabaseEnv();
    uploadLogoMock.mockResolvedValue({ ok: true, url: "https://cdn.example/dev/logo/abc.png" });

    const res = await POST(postRequest({ file: fakeFile() }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe("https://cdn.example/dev/logo/abc.png");
    expect(uploadLogoMock).toHaveBeenCalledWith(
      { marker: "fake-supabase-client" },
      expect.objectContaining({ file: expect.any(File) }),
    );
  });

  it("returns 502 with a friendly message when the upload fails", async () => {
    withSupabaseEnv();
    uploadLogoMock.mockResolvedValue({ ok: false, error: "Gagal mengunggah logo. Coba lagi." });

    const res = await POST(postRequest({ file: fakeFile() }));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});

describe("PATCH /api/business-logo", () => {
  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await PATCH(patchRequest({ position: "top-left" }));

    expect(res.status).toBe(503);
    expect(updateLogoPositionMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid position value", async () => {
    withSupabaseEnv();

    const res = await PATCH(patchRequest({ position: "middle" }));

    expect(res.status).toBe(400);
    expect(updateLogoPositionMock).not.toHaveBeenCalled();
  });

  it("updates the position and reports success", async () => {
    withSupabaseEnv();
    updateLogoPositionMock.mockResolvedValue({ ok: true });

    const res = await PATCH(patchRequest({ position: "bottom-right" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(updateLogoPositionMock).toHaveBeenCalledWith({ marker: "fake-supabase-client" }, "bottom-right");
  });

  it("returns 502 with a friendly message when the update fails", async () => {
    withSupabaseEnv();
    updateLogoPositionMock.mockResolvedValue({ ok: false, error: "Gagal mengubah posisi logo. Coba lagi." });

    const res = await PATCH(patchRequest({ position: "top-right" }));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});

describe("DELETE /api/business-logo", () => {
  it("returns 503 without creating a service-role client when the key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await DELETE();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toMatch(/service role/i);
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
    expect(deleteLogoMock).not.toHaveBeenCalled();
  });

  it("deletes successfully and returns ok", async () => {
    withSupabaseEnv();
    deleteLogoMock.mockResolvedValue({ ok: true });

    const res = await DELETE();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(deleteLogoMock).toHaveBeenCalledWith({ marker: "fake-service-role-client" });
  });

  it("returns a friendly 502 when deletion fails", async () => {
    withSupabaseEnv();
    deleteLogoMock.mockResolvedValue({ ok: false, error: "Gagal menghapus logo. Coba lagi." });

    const res = await DELETE();
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});
