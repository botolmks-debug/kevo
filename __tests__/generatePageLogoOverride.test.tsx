// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GeneratePage from "@/app/generate/page";
import { pengumumanTemplate } from "@/lib/templates/pengumuman";

const demoProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "", location: "" },
  offering: { mainProducts: "", flagshipProduct: "", priceRange: "", targetCustomer: "", customerProblem: "" },
  positioning: { differentiator: "", contentGoals: [], tone: "", cta: "", avoid: "" },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
  logo: { url: "https://cdn.example/dev/logo/abc.png", position: "top-right" as const },
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

async function flushMicrotasks() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("GeneratePage applies the business logo automatically", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends the render request with brand.logoUrl and logo position overridden from the business profile", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/business-profile")) {
        return Promise.resolve(jsonResponse({ profile: demoProfile }));
      }
      if (typeof url === "string" && url.includes("/api/images")) {
        return Promise.resolve(jsonResponse({ images: [] }));
      }
      if (typeof url === "string" && url.includes("/api/render")) {
        return Promise.resolve({ ok: true, blob: async () => new Blob(["fake"], { type: "image/png" }) });
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:fake"), revokeObjectURL: vi.fn() });

    render(<GeneratePage />);
    await flushMicrotasks();

    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Jadwal libur" } });
    fireEvent.change(screen.getByLabelText("Isi"), { target: { value: "Tutup mulai Senin depan." } });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/render", expect.objectContaining({ method: "POST" })));

    const call = fetchMock.mock.calls.find(([url]) => url === "/api/render") as unknown as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);

    expect(body.template.brand.logoUrl).toBe("https://cdn.example/dev/logo/abc.png");

    const canvas = pengumumanTemplate.layouts["4:5"].canvas;
    const expectedSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.4);
    expect(body.template.layouts["4:5"].logo).toEqual({
      x: canvas.width - 40 - expectedSize,
      y: 40,
      size: expectedSize,
    });
  });
});
