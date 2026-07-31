import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertGeneratedContent, listGeneratedContent } from "@/lib/supabase/generatedContent";
import { DEV_BUSINESS_ID } from "@/lib/supabase/devBusiness";

describe("insertGeneratedContent", () => {
  it("uploads the PNG buffer then inserts the row, returning the saved row", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const savedRow = {
      id: "gen-1",
      business_id: DEV_BUSINESS_ID,
      jenis: "produk",
      source_image_id: "img-1",
      storage_path: `${DEV_BUSINESS_ID}/generated/x.png`,
      on_image_text: "Kopi Segar",
      caption: "Halo dari Kopi Senja!",
      ratio: "4:5",
      status: "draft",
      created_at: "2026-01-01T00:00:00Z",
    };
    const single = vi.fn().mockResolvedValue({ data: savedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    const result = await insertGeneratedContent(client, {
      jenis: "produk",
      sourceImageId: "img-1",
      pngBuffer: Buffer.from("fake-png"),
      onImageText: "Kopi Segar",
      caption: "Halo dari Kopi Senja!",
      ratio: "4:5",
    });

    expect(result).toEqual({ ok: true, row: savedRow });
    expect(storageFrom).toHaveBeenCalledWith("user-images");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${DEV_BUSINESS_ID}/generated/.+\\.png$`)),
      expect.any(Buffer),
      { contentType: "image/png" },
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: DEV_BUSINESS_ID,
        jenis: "produk",
        source_image_id: "img-1",
        on_image_text: "Kopi Segar",
        caption: "Halo dari Kopi Senja!",
        ratio: "4:5",
      }),
    );
  });

  it("defaults source_image_id to null when not provided (general/interaksi)", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const single = vi.fn().mockResolvedValue({ data: { id: "gen-2" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    await insertGeneratedContent(client, {
      jenis: "general",
      pngBuffer: Buffer.from("fake-png"),
      onImageText: "Cerita Kami",
      caption: "Caption umum",
      ratio: "1:1",
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source_image_id: null }));
  });

  it("returns a friendly error instead of throwing when the storage upload fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "network down" } });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const from = vi.fn();
    const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient;

    const result = await insertGeneratedContent(client, {
      jenis: "general",
      pngBuffer: Buffer.from("fake-png"),
      onImageText: "x",
      caption: "y",
      ratio: "1:1",
    });

    expect(result.ok).toBe(false);
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

    const result = await insertGeneratedContent(client, {
      jenis: "general",
      pngBuffer: Buffer.from("fake-png"),
      onImageText: "x",
      caption: "y",
      ratio: "1:1",
    });

    expect(result.ok).toBe(false);
  });
});

describe("listGeneratedContent", () => {
  it("returns rows for the business, newest first, limited to 20", async () => {
    const rows = [{ id: "gen-2" }, { id: "gen-1" }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    const result = await listGeneratedContent(client);

    expect(result).toEqual({ ok: true, rows });
    expect(eq).toHaveBeenCalledWith("business_id", DEV_BUSINESS_ID);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("returns a friendly error instead of throwing on query failure", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient;

    const result = await listGeneratedContent(client);

    expect(result.ok).toBe(false);
  });
});
