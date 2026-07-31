import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateGeneratedContentMock, createServiceRoleClientMock, publicImageUrlMock } = vi.hoisted(() => ({
  updateGeneratedContentMock: vi.fn(),
  createServiceRoleClientMock: vi.fn().mockReturnValue({ marker: "fake-service-role-client" }),
  publicImageUrlMock: vi.fn((_client: unknown, path: string) => `https://cdn.example/${path}`),
}));

vi.mock("@/lib/supabase/generatedContent", () => ({
  updateGeneratedContent: updateGeneratedContentMock,
}));

vi.mock("@/lib/supabase/serviceRole", () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

vi.mock("@/lib/supabase/images", () => ({
  publicImageUrl: publicImageUrlMock,
}));

import { PATCH } from "@/app/api/generate-auto/[id]/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function fakeFile(name = "hasil.png"): File {
  return new File(["fake-png"], name, { type: "image/png" });
}

function patchRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/generate-auto/gen-1", { method: "PATCH", body: formData });
}

describe("PATCH /api/generate-auto/[id]", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    updateGeneratedContentMock.mockReset();
    createServiceRoleClientMock.mockClear();
    publicImageUrlMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 503 without creating a service-role client when the key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await PATCH(patchRequest({ file: fakeFile(), onImageText: "x", caption: "y" }), params("gen-1"));

    expect(res.status).toBe(503);
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
    expect(updateGeneratedContentMock).not.toHaveBeenCalled();
  });

  it("rejects when the file is missing", async () => {
    withSupabaseEnv();

    const res = await PATCH(patchRequest({ onImageText: "x", caption: "y" }), params("gen-1"));

    expect(res.status).toBe(400);
    expect(updateGeneratedContentMock).not.toHaveBeenCalled();
  });

  it("rejects when onImageText/caption are missing", async () => {
    withSupabaseEnv();

    const res = await PATCH(patchRequest({ file: fakeFile() }), params("gen-1"));

    expect(res.status).toBe(400);
    expect(updateGeneratedContentMock).not.toHaveBeenCalled();
  });

  it("updates successfully and returns the item with a public image url", async () => {
    withSupabaseEnv();
    updateGeneratedContentMock.mockResolvedValue({
      ok: true,
      row: {
        id: "gen-1",
        business_id: "biz-1",
        jenis: "produk",
        source_image_id: null,
        storage_path: "biz-1/generated/x.png",
        on_image_text: "Kopi Baru",
        caption: "Halo!",
        ratio: "4:5",
        status: "draft",
        created_at: "2026-01-02T00:00:00Z",
      },
    });

    const res = await PATCH(
      patchRequest({ file: fakeFile(), onImageText: "Kopi Baru", caption: "Halo!" }),
      params("gen-1"),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.item.imageUrl).toBe("https://cdn.example/biz-1/generated/x.png");
    expect(data.item.onImageText).toBe("Kopi Baru");
    expect(updateGeneratedContentMock).toHaveBeenCalledWith(
      { marker: "fake-service-role-client" },
      "gen-1",
      expect.objectContaining({ onImageText: "Kopi Baru", caption: "Halo!" }),
    );
  });

  it("returns a friendly 502 when the update fails", async () => {
    withSupabaseEnv();
    updateGeneratedContentMock.mockResolvedValue({ ok: false, error: "Konten tidak ditemukan." });

    const res = await PATCH(
      patchRequest({ file: fakeFile(), onImageText: "x", caption: "y" }),
      params("missing"),
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toBe("Konten tidak ditemukan.");
  });
});
