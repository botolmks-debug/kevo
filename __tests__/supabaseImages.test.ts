import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildImageRow, deleteImage, listImages, publicImageUrl, uploadImage } from "@/lib/supabase/images";
import { DEV_BUSINESS_ID } from "@/lib/supabase/devBusiness";

describe("buildImageRow", () => {
  it("assembles the row with type derived from category and given usage", () => {
    const row = buildImageRow({
      businessId: DEV_BUSINESS_ID,
      storagePath: `${DEV_BUSINESS_ID}/abc.jpg`,
      description: "Logo klinik warna biru",
      category: "Logo",
      usage: "apa_adanya",
    });

    expect(row).toEqual({
      business_id: DEV_BUSINESS_ID,
      storage_path: `${DEV_BUSINESS_ID}/abc.jpg`,
      description: "Logo klinik warna biru",
      category: "Logo",
      type: "logo",
      usage: "apa_adanya",
    });
  });

  it("falls back to type 'lain' for an unrecognized category", () => {
    const row = buildImageRow({
      businessId: DEV_BUSINESS_ID,
      storagePath: "x.jpg",
      description: "",
      category: "Kategori Baru",
      usage: "olah_ai",
    });

    expect(row.type).toBe("lain");
  });
});

function fakeFile(name: string): File {
  return new File(["dummy"], name, { type: "image/jpeg" });
}

describe("uploadImage", () => {
  it("uploads to storage then inserts the row, returning the saved image", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const savedRow = {
      id: "img-1",
      business_id: DEV_BUSINESS_ID,
      storage_path: "path.jpg",
      description: "Produk unggulan",
      category: "Produk",
      type: "produk",
      usage: "apa_adanya",
      created_at: "2026-01-01T00:00:00Z",
    };
    const single = vi.fn().mockResolvedValue({ data: savedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    const result = await uploadImage(client, {
      file: fakeFile("produk.jpg"),
      description: "Produk unggulan",
      category: "Produk",
      usage: "apa_adanya",
    });

    expect(result).toEqual({ ok: true, image: savedRow });
    expect(storageFrom).toHaveBeenCalledWith("user-images");
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${DEV_BUSINESS_ID}/.+\\.jpg$`)), expect.any(File));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ category: "Produk", type: "produk" }));
  });

  it("returns a friendly error instead of throwing when the storage upload fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "network down" } });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const from = vi.fn();
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    const result = await uploadImage(client, {
      file: fakeFile("x.jpg"),
      description: "",
      category: "Lain-lain",
      usage: "apa_adanya",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a friendly error when the upload succeeds but the DB insert fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "constraint violation" } });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    const result = await uploadImage(client, {
      file: fakeFile("x.jpg"),
      description: "",
      category: "Lain-lain",
      usage: "apa_adanya",
    });

    expect(result.ok).toBe(false);
  });
});

describe("listImages", () => {
  it("returns images for the business ordered newest first", async () => {
    const images = [{ id: "img-2" }, { id: "img-1" }];
    const order = vi.fn().mockResolvedValue({ data: images, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    const result = await listImages(client);

    expect(result).toEqual({ ok: true, images });
    expect(eq).toHaveBeenCalledWith("business_id", DEV_BUSINESS_ID);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns a friendly error instead of throwing on query failure", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    const result = await listImages(client);

    expect(result.ok).toBe(false);
  });
});

function mockDeleteClient(opts: {
  found?: { storage_path: string } | null;
  fetchError?: unknown;
  deleteError?: unknown;
  storageError?: unknown;
}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: opts.found ?? null, error: opts.fetchError ?? null });
  const eqSelect = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqSelect });

  const eqDelete = vi.fn().mockResolvedValue({ error: opts.deleteError ?? null });
  const del = vi.fn().mockReturnValue({ eq: eqDelete });

  const from = vi.fn().mockReturnValue({ select, delete: del });

  const remove = vi.fn().mockResolvedValue({ error: opts.storageError ?? null });
  const storageFrom = vi.fn().mockReturnValue({ remove });

  const client = { from, storage: { from: storageFrom } } as unknown as SupabaseClient;
  return { client, eqSelect, eqDelete, del, remove };
}

describe("deleteImage", () => {
  it("deletes the DB row then removes the storage file, reporting full success", async () => {
    const { client, eqSelect, eqDelete, remove } = mockDeleteClient({
      found: { storage_path: "biz/1.jpg" },
    });

    const result = await deleteImage(client, "img-1");

    expect(result).toEqual({ ok: true, storageCleanedUp: true });
    expect(eqSelect).toHaveBeenCalledWith("id", "img-1");
    expect(eqDelete).toHaveBeenCalledWith("id", "img-1");
    expect(remove).toHaveBeenCalledWith(["biz/1.jpg"]);
  });

  it("still reports success when the row is gone but the storage file cleanup fails", async () => {
    const { client } = mockDeleteClient({
      found: { storage_path: "biz/1.jpg" },
      storageError: { message: "network down" },
    });

    const result = await deleteImage(client, "img-1");

    expect(result).toEqual({ ok: true, storageCleanedUp: false });
  });

  it("returns a friendly error and never touches storage when the row doesn't exist", async () => {
    const { client, del, remove } = mockDeleteClient({ found: null });

    const result = await deleteImage(client, "missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak ditemukan/i);
    expect(del).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("returns a friendly error and never touches storage when the row delete fails", async () => {
    const { client, remove } = mockDeleteClient({
      found: { storage_path: "biz/1.jpg" },
      deleteError: { message: "constraint violation" },
    });

    const result = await deleteImage(client, "img-1");

    expect(result.ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("returns a friendly error instead of throwing when the initial lookup fails", async () => {
    const { client } = mockDeleteClient({ fetchError: { message: "timeout" } });

    const result = await deleteImage(client, "img-1");

    expect(result.ok).toBe(false);
  });
});

describe("publicImageUrl", () => {
  it("builds the public URL via the storage client", () => {
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example/user-images/x.jpg" } });
    const storageFrom = vi.fn().mockReturnValue({ getPublicUrl });
    const client = { storage: { from: storageFrom } } as unknown as SupabaseClient;

    const url = publicImageUrl(client, "x.jpg");

    expect(url).toBe("https://cdn.example/user-images/x.jpg");
    expect(storageFrom).toHaveBeenCalledWith("user-images");
    expect(getPublicUrl).toHaveBeenCalledWith("x.jpg");
  });
});
