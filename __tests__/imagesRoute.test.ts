import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listImagesMock, uploadImageMock, publicImageUrlMock, createClientMock } = vi.hoisted(() => ({
  listImagesMock: vi.fn(),
  uploadImageMock: vi.fn(),
  publicImageUrlMock: vi.fn(),
  createClientMock: vi.fn().mockResolvedValue({ marker: "fake-supabase-client" }),
}));

vi.mock("@/lib/supabase/images", () => ({
  listImages: listImagesMock,
  uploadImage: uploadImageMock,
  publicImageUrl: publicImageUrlMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { GET, POST } from "@/app/api/images/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

function postRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/images", { method: "POST", body: formData });
}

function fakeFile(name = "produk.jpg"): File {
  return new File(["dummy"], name, { type: "image/jpeg" });
}

describe("GET /api/images", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    listImagesMock.mockReset();
    publicImageUrlMock.mockReset();
    createClientMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await GET();

    expect(res.status).toBe(503);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("attaches a publicUrl to every image", async () => {
    withSupabaseEnv();
    listImagesMock.mockResolvedValue({
      ok: true,
      images: [{ id: "1", storage_path: "biz/1.jpg", category: "Produk" }],
    });
    publicImageUrlMock.mockReturnValue("https://cdn.example/biz/1.jpg");

    const res = await GET();
    const data = await res.json();

    expect(data.images).toEqual([
      { id: "1", storage_path: "biz/1.jpg", category: "Produk", publicUrl: "https://cdn.example/biz/1.jpg" },
    ]);
  });

  it("returns 502 with a friendly message when the query fails", async () => {
    withSupabaseEnv();
    listImagesMock.mockResolvedValue({ ok: false, error: "Gagal memuat daftar gambar. Coba lagi." });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});

describe("POST /api/images", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    uploadImageMock.mockReset();
    publicImageUrlMock.mockReset();
    createClientMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const res = await POST(postRequest({ file: fakeFile(), category: "Produk" }));

    expect(res.status).toBe(503);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects when the file is missing", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ category: "Produk", description: "x" }));

    expect(res.status).toBe(400);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown category", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ file: fakeFile(), category: "Kategori Ngasal" }));

    expect(res.status).toBe(400);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid usage value", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ file: fakeFile(), category: "Produk", usage: "ubah_semua" }));

    expect(res.status).toBe(400);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("defaults usage to apa_adanya when omitted, and uploads successfully", async () => {
    withSupabaseEnv();
    const savedImage = {
      id: "img-1",
      business_id: "dev",
      storage_path: "dev/img-1.jpg",
      description: "Produk unggulan",
      category: "Produk",
      type: "produk",
      usage: "apa_adanya",
      created_at: "2026-01-01T00:00:00Z",
    };
    uploadImageMock.mockResolvedValue({ ok: true, image: savedImage });
    publicImageUrlMock.mockReturnValue("https://cdn.example/dev/img-1.jpg");

    const res = await POST(postRequest({ file: fakeFile(), category: "Produk", description: "Produk unggulan" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.image).toEqual({ ...savedImage, publicUrl: "https://cdn.example/dev/img-1.jpg" });
    expect(uploadImageMock).toHaveBeenCalledWith(
      { marker: "fake-supabase-client" },
      expect.objectContaining({ category: "Produk", description: "Produk unggulan", usage: "apa_adanya" }),
    );
  });

  it("returns 502 with a friendly message when the upload fails", async () => {
    withSupabaseEnv();
    uploadImageMock.mockResolvedValue({ ok: false, error: "Gagal mengunggah gambar. Coba lagi." });

    const res = await POST(postRequest({ file: fakeFile(), category: "Produk" }));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gagal/i);
  });
});
