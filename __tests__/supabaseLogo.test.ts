import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { uploadLogo, deleteLogo, updateLogoPosition, removeLogoBackground } from "@/lib/supabase/logo";
import { DEV_BUSINESS_ID } from "@/lib/supabase/devBusiness";

function fakeFile(name: string): File {
  return new File(["dummy"], name, { type: "image/png" });
}

async function fakeLogoPng(): Promise<Buffer> {
  const data = Buffer.alloc(10 * 10 * 3, 255); // 10x10 solid white
  return sharp(data, { raw: { width: 10, height: 10, channels: 3 } }).png().toBuffer();
}

function mockClient(input: {
  currentPath?: string | null;
  currentPathError?: { message: string };
  upsert?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
  storageUpload?: ReturnType<typeof vi.fn>;
  storageRemove?: ReturnType<typeof vi.fn>;
  storageDownload?: ReturnType<typeof vi.fn>;
  publicUrl?: string;
}): SupabaseClient {
  const maybeSingle = vi.fn().mockResolvedValue(
    input.currentPathError
      ? { data: null, error: input.currentPathError }
      : { data: { logo_storage_path: input.currentPath ?? null }, error: null },
  );
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const upsert = input.upsert ?? vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = input.update ?? vi.fn().mockReturnValue({ eq: updateEq });
  const from = vi.fn().mockReturnValue({ select, upsert, update });

  const upload = input.storageUpload ?? vi.fn().mockResolvedValue({ error: null });
  const remove = input.storageRemove ?? vi.fn().mockResolvedValue({ error: null });
  const download =
    input.storageDownload ??
    vi.fn().mockImplementation(async () => ({ data: new Blob([new Uint8Array(await fakeLogoPng())]), error: null }));
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: input.publicUrl ?? "https://cdn/logo.png" } });
  const storageFrom = vi.fn().mockReturnValue({ upload, remove, download, getPublicUrl });

  return { from, storage: { from: storageFrom } } as unknown as SupabaseClient;
}

describe("uploadLogo", () => {
  it("uploads the file, saves the reference, and returns the public url when there was no previous logo", async () => {
    const client = mockClient({ currentPath: null });

    const result = await uploadLogo(client, { file: fakeFile("logo.png") });

    expect(result).toEqual({ ok: true, url: "https://cdn/logo.png" });
    const storageFrom = (client.storage.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(storageFrom.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${DEV_BUSINESS_ID}/logo/.+\\.png$`)),
      expect.any(File),
    );
    expect(storageFrom.remove).not.toHaveBeenCalled();
  });

  it("deletes the old file after successfully saving the new reference", async () => {
    const oldPath = `${DEV_BUSINESS_ID}/logo/old.png`;
    const client = mockClient({ currentPath: oldPath });

    await uploadLogo(client, { file: fakeFile("new.png") });

    const storageFrom = (client.storage.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(storageFrom.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("returns a friendly error and skips storage entirely when reading the current logo fails", async () => {
    const client = mockClient({ currentPathError: { message: "timeout" } });

    const result = await uploadLogo(client, { file: fakeFile("logo.png") });

    expect(result.ok).toBe(false);
    const storageFrom = (client.storage.from as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(storageFrom).toBeUndefined();
  });

  it("returns a friendly error and never touches the profile row when the storage upload fails", async () => {
    const upsert = vi.fn();
    const client = mockClient({
      currentPath: null,
      upsert,
      storageUpload: vi.fn().mockResolvedValue({ error: { message: "quota exceeded" } }),
    });

    const result = await uploadLogo(client, { file: fakeFile("logo.png") });

    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns a friendly error when the upload succeeds but saving the reference fails", async () => {
    const client = mockClient({
      currentPath: null,
      upsert: vi.fn().mockResolvedValue({ error: { message: "constraint violation" } }),
    });

    const result = await uploadLogo(client, { file: fakeFile("logo.png") });

    expect(result.ok).toBe(false);
  });
});

describe("deleteLogo", () => {
  it("clears the reference and removes the file when a logo exists", async () => {
    const path = `${DEV_BUSINESS_ID}/logo/abc.png`;
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const client = mockClient({ currentPath: path, update });

    const result = await deleteLogo(client);

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ logo_storage_path: null }));
    expect(updateEq).toHaveBeenCalledWith("business_id", DEV_BUSINESS_ID);
    const storageFrom = (client.storage.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(storageFrom.remove).toHaveBeenCalledWith([path]);
  });

  it("is a no-op success when there is no logo to delete", async () => {
    const update = vi.fn();
    const client = mockClient({ currentPath: null, update });

    const result = await deleteLogo(client);

    expect(result).toEqual({ ok: true });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a friendly error when reading the current logo fails", async () => {
    const client = mockClient({ currentPathError: { message: "timeout" } });

    const result = await deleteLogo(client);

    expect(result.ok).toBe(false);
  });

  it("returns a friendly error and skips storage cleanup when clearing the reference fails", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: { message: "constraint violation" } });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const client = mockClient({ currentPath: `${DEV_BUSINESS_ID}/logo/abc.png`, update });

    const result = await deleteLogo(client);

    expect(result.ok).toBe(false);
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("still reports success when the reference is cleared but storage cleanup fails", async () => {
    const client = mockClient({
      currentPath: `${DEV_BUSINESS_ID}/logo/abc.png`,
      storageRemove: vi.fn().mockResolvedValue({ error: { message: "network down" } }),
    });

    const result = await deleteLogo(client);

    expect(result).toEqual({ ok: true });
  });
});

describe("updateLogoPosition", () => {
  it("upserts the new position and reports success", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = mockClient({ currentPath: null, upsert });

    const result = await updateLogoPosition(client, "bottom-right");

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: DEV_BUSINESS_ID, logo_position: "bottom-right" }),
      { onConflict: "business_id" },
    );
  });

  it("returns a friendly error instead of throwing when the upsert fails", async () => {
    const client = mockClient({
      currentPath: null,
      upsert: vi.fn().mockResolvedValue({ error: { message: "connection refused" } }),
    });

    const result = await updateLogoPosition(client, "top-right");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("removeLogoBackground", () => {
  it("downloads the current logo, processes it, saves it as a new file, and cleans up the old one", async () => {
    const oldPath = `${DEV_BUSINESS_ID}/logo/old.png`;
    const client = mockClient({ currentPath: oldPath });

    const result = await removeLogoBackground(client);

    expect(result).toEqual({ ok: true, url: "https://cdn/logo.png" });
    const storageFrom = (client.storage.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(storageFrom.download).toHaveBeenCalledWith(oldPath);
    expect(storageFrom.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${DEV_BUSINESS_ID}/logo/.+\\.png$`)),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png" }),
    );
    expect(storageFrom.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("returns a friendly error when there is no logo to process", async () => {
    const client = mockClient({ currentPath: null });

    const result = await removeLogoBackground(client);

    expect(result.ok).toBe(false);
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("returns a friendly error when reading the current logo reference fails", async () => {
    const client = mockClient({ currentPathError: { message: "timeout" } });

    const result = await removeLogoBackground(client);

    expect(result.ok).toBe(false);
  });

  it("returns a friendly error when downloading the file fails", async () => {
    const client = mockClient({
      currentPath: `${DEV_BUSINESS_ID}/logo/old.png`,
      storageDownload: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });

    const result = await removeLogoBackground(client);

    expect(result.ok).toBe(false);
  });

  it("returns a friendly error and never touches the profile row when saving the processed file fails", async () => {
    const upsert = vi.fn();
    const client = mockClient({
      currentPath: `${DEV_BUSINESS_ID}/logo/old.png`,
      upsert,
      storageUpload: vi.fn().mockResolvedValue({ error: { message: "quota exceeded" } }),
    });

    const result = await removeLogoBackground(client);

    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
