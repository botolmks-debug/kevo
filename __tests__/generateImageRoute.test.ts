import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { editImageMock } = vi.hoisted(() => ({
  editImageMock: vi.fn(),
}));

vi.mock("@/lib/ai/geminiImage", () => ({
  editImage: editImageMock,
}));

import { POST } from "@/app/api/generate-image/route";

const validProfile = {
  business: { name: "Auvo", industry: "Vending machine", age: "3 tahun", location: "Jakarta" },
  offering: {
    mainProducts: "-",
    flagshipProduct: "-",
    priceRange: "-",
    targetCustomer: "Kantor modern",
    customerProblem: "-",
  },
  positioning: { differentiator: "-", contentGoals: [], tone: "profesional", cta: "-", avoid: "" },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-image", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/generate-image", () => {
  afterEach(() => {
    editImageMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("rejects a missing/invalid aspectRatio", async () => {
    const res = await POST(
      postRequest({ imageUrl: "https://example.com/x.jpg", aspectRatio: "16:9", profile: validProfile }),
    );

    expect(res.status).toBe(400);
    expect(editImageMock).not.toHaveBeenCalled();
  });

  it("rejects a missing profile", async () => {
    const res = await POST(postRequest({ imageUrl: "https://example.com/x.jpg", aspectRatio: "1:1" }));

    expect(res.status).toBe(400);
    expect(editImageMock).not.toHaveBeenCalled();
  });

  it("fetches the source image, calls Gemini with a scene prompt, and returns the composed data URI", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new TextEncoder().encode("fake-bytes").buffer,
    });
    vi.stubGlobal("fetch", fetchMock);
    editImageMock.mockResolvedValue({ ok: true, dataUri: "data:image/png;base64,xyz" });

    const res = await POST(
      postRequest({ imageUrl: "https://example.com/x.jpg", aspectRatio: "9:16", profile: validProfile }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ dataUri: "data:image/png;base64,xyz" });
    const call = editImageMock.mock.calls[0][0];
    expect(call.mimeType).toBe("image/jpeg");
    expect(call.aspectRatio).toBe("9:16");
    expect(call.prompt).toContain("Kantor modern");
  });

  it("returns a friendly error when the source image can't be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const res = await POST(
      postRequest({ imageUrl: "https://example.com/missing.jpg", aspectRatio: "1:1", profile: validProfile }),
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/gambar sumber/i);
    expect(editImageMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error when Gemini fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => new TextEncoder().encode("fake-bytes").buffer,
      }),
    );
    editImageMock.mockResolvedValue({ ok: false, error: "Layanan AI sedang sibuk, coba lagi." });

    const res = await POST(
      postRequest({ imageUrl: "https://example.com/x.jpg", aspectRatio: "1:1", profile: validProfile }),
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/sibuk/i);
  });
});
