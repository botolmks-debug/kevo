// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GeneratePage from "@/app/generate/page";

const demoProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "", location: "" },
  offering: { mainProducts: "", flagshipProduct: "", priceRange: "", targetCustomer: "", customerProblem: "" },
  positioning: { differentiator: "", contentGoals: [], tone: "", cta: "", avoid: "" },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

async function flushMicrotasks() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("GeneratePage caption button", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a friendly message and skips the request when there is no business profile yet", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ profile: null }));
    vi.stubGlobal("fetch", fetchMock);

    render(<GeneratePage />);
    await flushMicrotasks();
    fetchMock.mockClear();

    fireEvent.click(screen.getByText("Generate Caption (AI)"));

    expect(await screen.findByText(/profil bisnis/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables the button while a caption request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    const fetchMock = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/business-profile")) {
        return Promise.resolve(jsonResponse({ profile: demoProfile }));
      }
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GeneratePage />);
    await flushMicrotasks();

    const button = screen.getByText("Generate Caption (AI)");
    fireEvent.click(button);

    expect(await screen.findByText("Sedang membuat…")).toBeInTheDocument();
    expect(screen.getByText("Sedang membuat…").closest("button")).toBeDisabled();

    resolveFetch(jsonResponse({ caption: "Caption hasil AI" }));

    await waitFor(() => expect(screen.getByText("Generate Caption (AI)")).toBeInTheDocument());
  });
});
