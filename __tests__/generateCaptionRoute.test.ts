import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { generateCaptionMock } = vi.hoisted(() => ({ generateCaptionMock: vi.fn() }));

vi.mock("@/lib/ai/gemini", () => ({
  generateCaption: generateCaptionMock,
  GEMINI_TEXT_MODEL: "gemini-flash-lite-latest",
}));

import { POST } from "@/app/api/generate-caption/route";

const validProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "3 tahun", location: "Bandung" },
  offering: {
    mainProducts: "Konsultasi umum",
    flagshipProduct: "Medical check-up",
    priceRange: "-",
    targetCustomer: "Keluarga muda",
    customerProblem: "-",
  },
  positioning: {
    differentiator: "Dokter berpengalaman",
    contentGoals: ["jualan"],
    tone: "hangat",
    cta: "Daftar via WhatsApp",
    avoid: "Jangan klaim menyembuhkan",
  },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-caption", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/generate-caption", () => {
  afterEach(() => {
    generateCaptionMock.mockReset();
  });

  it("returns 400 when the body is missing required fields", async () => {
    const res = await POST(request({ templateName: "Pengumuman" }));

    expect(res.status).toBe(400);
    expect(generateCaptionMock).not.toHaveBeenCalled();
  });

  it("returns the caption from Gemini on success", async () => {
    generateCaptionMock.mockResolvedValue({ ok: true, text: "Promo spesial minggu ini!" });

    const res = await POST(
      request({ profile: validProfile, templateName: "Pengumuman", values: { Headline: "Promo" } }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ caption: "Promo spesial minggu ini!" });
    expect(generateCaptionMock).toHaveBeenCalledTimes(1);
    const promptArg = generateCaptionMock.mock.calls[0][0] as string;
    expect(promptArg).toContain("hangat");
  });

  it("returns a friendly error status without leaking internals when Gemini fails", async () => {
    generateCaptionMock.mockResolvedValue({ ok: false, error: "Layanan AI sedang sibuk, coba lagi." });

    const res = await POST(
      request({ profile: validProfile, templateName: "Pengumuman", values: {} }),
    );
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/sibuk/i);
  });
});
