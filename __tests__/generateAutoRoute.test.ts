import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  loadBusinessProfileMock,
  listImagesMock,
  publicImageUrlMock,
  insertGeneratedContentMock,
  listGeneratedContentMock,
  editImageMock,
  generateImageMock,
  generateJsonContentMock,
  renderTemplateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn().mockResolvedValue({ marker: "fake-supabase-client" }),
  loadBusinessProfileMock: vi.fn(),
  listImagesMock: vi.fn(),
  publicImageUrlMock: vi.fn((_client: unknown, path: string) => `https://cdn.example/${path}`),
  insertGeneratedContentMock: vi.fn(),
  listGeneratedContentMock: vi.fn(),
  editImageMock: vi.fn(),
  generateImageMock: vi.fn(),
  generateJsonContentMock: vi.fn(),
  renderTemplateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/supabase/businessProfile", () => ({ loadBusinessProfile: loadBusinessProfileMock }));
vi.mock("@/lib/supabase/images", () => ({ listImages: listImagesMock, publicImageUrl: publicImageUrlMock }));
vi.mock("@/lib/supabase/generatedContent", () => ({
  insertGeneratedContent: insertGeneratedContentMock,
  listGeneratedContent: listGeneratedContentMock,
}));
vi.mock("@/lib/ai/geminiImage", () => ({ editImage: editImageMock, generateImage: generateImageMock }));
vi.mock("@/lib/ai/geminiJson", () => ({ generateJsonContent: generateJsonContentMock }));
vi.mock("@/lib/render/renderTemplate", () => ({ renderTemplate: renderTemplateMock }));

import { GET, POST } from "@/app/api/generate-auto/route";

const ORIGINAL_ENV = { ...process.env };

function withSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

const validProfile = {
  business: { name: "Kopi Senja", industry: "Kedai kopi", age: "2 tahun", location: "Bandung" },
  offering: {
    mainProducts: "Kopi susu",
    flagshipProduct: "Kopi Susu Senja",
    priceRange: "-",
    targetCustomer: "Anak muda",
    customerProblem: "-",
  },
  positioning: { differentiator: "-", contentGoals: [], tone: "santai", cta: "-", avoid: "" },
  socials: { entries: [{ platformId: "instagram", value: "@kopisenja" }], selectedPlatformIds: ["instagram"] },
  story: "",
  logo: null,
};

const produkImage = {
  id: "img-1",
  business_id: "biz-1",
  storage_path: "biz-1/produk.jpg",
  description: "Kopi Susu Senja 250ml",
  category: "Produk",
  type: "produk",
  usage: "olah_ai",
  created_at: "2026-01-01T00:00:00Z",
};

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-auto", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  createClientMock.mockClear();
  loadBusinessProfileMock.mockReset();
  listImagesMock.mockReset();
  publicImageUrlMock.mockClear();
  insertGeneratedContentMock.mockReset();
  listGeneratedContentMock.mockReset();
  editImageMock.mockReset();
  generateImageMock.mockReset();
  generateJsonContentMock.mockReset();
  renderTemplateMock.mockReset();
  vi.unstubAllGlobals();

  loadBusinessProfileMock.mockResolvedValue({ ok: true, profile: validProfile });
  renderTemplateMock.mockResolvedValue(Buffer.from("fake-png"));
  insertGeneratedContentMock.mockResolvedValue({
    ok: true,
    row: {
      id: "gen-1",
      business_id: "biz-1",
      jenis: "produk",
      source_image_id: null,
      storage_path: "biz-1/generated/x.png",
      on_image_text: "Kopi Segar",
      caption: "Halo!",
      ratio: "4:5",
      status: "draft",
      created_at: "2026-01-02T00:00:00Z",
    },
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("GET /api/generate-auto", () => {
  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await GET();

    expect(res.status).toBe(503);
    expect(listGeneratedContentMock).not.toHaveBeenCalled();
  });

  it("maps rows to items with a public image url", async () => {
    withSupabaseEnv();
    listGeneratedContentMock.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: "gen-1",
          jenis: "produk",
          source_image_id: null,
          storage_path: "biz-1/generated/x.png",
          on_image_text: "Kopi Segar",
          caption: "Halo!",
          ratio: "4:5",
          status: "draft",
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([
      {
        id: "gen-1",
        jenis: "produk",
        imageUrl: "https://cdn.example/biz-1/generated/x.png",
        onImageText: "Kopi Segar",
        caption: "Halo!",
        ratio: "4:5",
        status: "draft",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
  });

  it("returns 502 with a friendly message when the query fails", async () => {
    withSupabaseEnv();
    listGeneratedContentMock.mockResolvedValue({ ok: false, error: "Gagal memuat riwayat konten. Coba lagi." });

    const res = await GET();

    expect(res.status).toBe(502);
  });
});

describe("POST /api/generate-auto", () => {
  it("returns 503 without touching supabase when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));

    expect(res.status).toBe(503);
    expect(loadBusinessProfileMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid jenis", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ jenis: "unknown", ratio: "4:5" }));

    expect(res.status).toBe(400);
    expect(loadBusinessProfileMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid ratio", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ jenis: "general", ratio: "16:9" }));

    expect(res.status).toBe(400);
  });

  it("rejects jenis 'produk' without an imageId", async () => {
    withSupabaseEnv();

    const res = await POST(postRequest({ jenis: "produk", ratio: "4:5" }));

    expect(res.status).toBe(400);
    expect(loadBusinessProfileMock).not.toHaveBeenCalled();
  });

  it("returns 400 when there is no business profile yet", async () => {
    withSupabaseEnv();
    loadBusinessProfileMock.mockResolvedValue({ ok: true, profile: null });

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/profil bisnis/i);
  });

  it("returns 400 when the chosen product image isn't found or isn't eligible for AI", async () => {
    withSupabaseEnv();
    listImagesMock.mockResolvedValue({ ok: true, images: [{ ...produkImage, usage: "apa_adanya" }] });

    const res = await POST(postRequest({ jenis: "produk", ratio: "4:5", imageId: "img-1" }));

    expect(res.status).toBe(400);
    expect(generateJsonContentMock).not.toHaveBeenCalled();
  });

  it("generates a 'produk' item end-to-end: scene edit on the picked image + rendered PNG saved to history", async () => {
    withSupabaseEnv();
    listImagesMock.mockResolvedValue({ ok: true, images: [produkImage] });
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "Kopi Segar", caption: "Halo dari Kopi Senja!" },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new TextEncoder().encode("fake-bytes").buffer,
    });
    vi.stubGlobal("fetch", fetchMock);
    editImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,edited" });

    const res = await POST(postRequest({ jenis: "produk", ratio: "4:5", imageId: "img-1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(generateImageMock).not.toHaveBeenCalled();
    expect(editImageMock).toHaveBeenCalledTimes(1);
    const editCall = editImageMock.mock.calls[0][0];
    expect(editCall.aspectRatio).toBe("4:5");
    expect(editCall.prompt).toContain("Anak muda"); // dari buildScenePrompt(profile)

    const renderCall = renderTemplateMock.mock.calls[0][0];
    expect(renderCall.values).toEqual({ photo: "data:image/png;base64,edited", caption: "Kopi Segar" });
    expect(renderCall.ratio).toBe("4:5");

    const insertCall = insertGeneratedContentMock.mock.calls[0][1];
    expect(insertCall.jenis).toBe("produk");
    expect(insertCall.sourceImageId).toBe("img-1");
    expect(insertCall.onImageText).toBe("Kopi Segar");
    expect(insertCall.caption).toBe("Halo dari Kopi Senja!");

    expect(data.item.id).toBe("gen-1");
    expect(data.item.imageUrl).toBe("https://cdn.example/biz-1/generated/x.png");
  });

  it("generates a 'general' item end-to-end: AI decides the scene, generateImage is used (no source photo)", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "Cerita Kami", caption: "Caption umum", imageScene: "meja kopi pagi hari" },
    });
    generateImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,generated" });

    const res = await POST(postRequest({ jenis: "general", ratio: "1:1" }));

    expect(res.status).toBe(200);
    expect(editImageMock).not.toHaveBeenCalled();
    expect(listImagesMock).not.toHaveBeenCalled();
    const imageCall = generateImageMock.mock.calls[0][0];
    expect(imageCall.aspectRatio).toBe("1:1");
    expect(imageCall.prompt).toContain("meja kopi pagi hari");
    expect(imageCall.prompt).toMatch(/foto editorial realistis/i);
  });

  it("generates an 'interaksi' item end-to-end with an illustration-style prompt", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "Tebak Yuk!", caption: "Kuis: A, B, atau C?", imageScene: "cangkir kopi tersenyum" },
    });
    generateImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,generated" });

    const res = await POST(postRequest({ jenis: "interaksi", ratio: "9:16" }));

    expect(res.status).toBe(200);
    const imageCall = generateImageMock.mock.calls[0][0];
    expect(imageCall.prompt).toContain("cangkir kopi tersenyum");
    expect(imageCall.prompt).toMatch(/ilustrasi digital yang lucu dan ceria/i);
  });

  it("returns 502 when the AI text/JSON generation fails", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({ ok: false, error: "Layanan AI sedang sibuk, coba lagi." });

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));

    expect(res.status).toBe(502);
    expect(generateImageMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the AI response is missing required fields (e.g. no imageScene for general)", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({ ok: true, data: { onImageText: "x", caption: "y" } });

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));

    expect(res.status).toBe(502);
    expect(generateImageMock).not.toHaveBeenCalled();
  });

  it("returns 502 when image generation fails", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "x", caption: "y", imageScene: "z" },
    });
    generateImageMock.mockResolvedValue({ ok: false, error: "Layanan AI sedang sibuk, coba lagi." });

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));

    expect(res.status).toBe(502);
    expect(insertGeneratedContentMock).not.toHaveBeenCalled();
  });

  it("returns 500 when rendering fails", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "x", caption: "y", imageScene: "z" },
    });
    generateImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,generated" });
    renderTemplateMock.mockRejectedValue(new Error("font tidak ditemukan"));

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/font tidak ditemukan/);
  });

  it("returns 502 when saving to history fails", async () => {
    withSupabaseEnv();
    generateJsonContentMock.mockResolvedValue({
      ok: true,
      data: { onImageText: "x", caption: "y", imageScene: "z" },
    });
    generateImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,generated" });
    insertGeneratedContentMock.mockResolvedValue({ ok: false, error: "Gagal mengunggah hasil generate. Coba lagi." });

    const res = await POST(postRequest({ jenis: "general", ratio: "4:5" }));

    expect(res.status).toBe(502);
  });
});
