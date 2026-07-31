// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GeneratePage from "@/app/generate/page";

const demoProfile = {
  business: { name: "Klinik Sehat", industry: "Klinik", age: "", location: "" },
  offering: {
    mainProducts: "",
    flagshipProduct: "",
    priceRange: "",
    targetCustomer: "ibu muda",
    customerProblem: "",
  },
  positioning: { differentiator: "", contentGoals: [], tone: "", cta: "", avoid: "" },
  socials: { entries: [], selectedPlatformIds: [] },
  story: "",
};

const apaAdanyaImage = {
  id: "img-1",
  description: "Logo klinik",
  category: "Logo",
  publicUrl: "https://example.com/logo.jpg",
  usage: "apa_adanya" as const,
};

const olahAiImage = {
  id: "img-2",
  description: "Foto suasana",
  category: "Suasana/Fasilitas",
  publicUrl: "https://example.com/suasana.jpg",
  usage: "olah_ai" as const,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

async function flushMicrotasks() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function makeFetchMock(generateImageHandler: (body: unknown) => Promise<unknown>) {
  return vi.fn((url: string) => {
    if (typeof url === "string" && url.includes("/api/business-profile")) {
      return Promise.resolve(jsonResponse({ profile: demoProfile }));
    }
    if (typeof url === "string" && url.includes("/api/images")) {
      return Promise.resolve(jsonResponse({ images: [apaAdanyaImage, olahAiImage] }));
    }
    if (typeof url === "string" && url.includes("/api/generate-image")) {
      return generateImageHandler(url);
    }
    return Promise.resolve(jsonResponse({}));
  });
}

async function pickImage(publicUrl: string) {
  fireEvent.change(screen.getByLabelText("Foto (opsional)"), { target: { value: publicUrl } });
}

describe("GeneratePage AI scene compose", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("only shows the AI button for images flagged olah_ai", async () => {
    vi.stubGlobal("fetch", makeFetchMock(() => Promise.resolve(jsonResponse({ dataUri: "data:image/png;base64,X" }))));

    render(<GeneratePage />);
    await flushMicrotasks();

    await pickImage(apaAdanyaImage.publicUrl);
    expect(screen.queryByText("Generate Gambar AI")).not.toBeInTheDocument();

    await pickImage(olahAiImage.publicUrl);
    expect(screen.getByText("Generate Gambar AI")).toBeInTheDocument();
  });

  it("disables the button while composing, then swaps the preview to the AI result", async () => {
    let resolveGenerate: (value: unknown) => void = () => {};
    const fetchMock = makeFetchMock(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<GeneratePage />);
    await flushMicrotasks();
    await pickImage(olahAiImage.publicUrl);

    const button = screen.getByText("Generate Gambar AI");
    fireEvent.click(button);

    expect(await screen.findByText("Sedang membuat…")).toBeInTheDocument();
    expect(screen.getByText("Sedang membuat…").closest("button")).toBeDisabled();

    resolveGenerate(jsonResponse({ dataUri: "data:image/png;base64,HASIL" }));

    await waitFor(() =>
      expect(screen.getByAltText("Pratinjau gambar terpilih")).toHaveAttribute(
        "src",
        "data:image/png;base64,HASIL",
      ),
    );
  });

  it("caches the result per image+ratio+targetCustomer so a repeat click does not re-fetch", async () => {
    const generateImageMock = vi.fn(() => Promise.resolve(jsonResponse({ dataUri: "data:image/png;base64,HASIL" })));
    vi.stubGlobal("fetch", makeFetchMock(generateImageMock));

    render(<GeneratePage />);
    await flushMicrotasks();
    await pickImage(olahAiImage.publicUrl);

    fireEvent.click(screen.getByText("Generate Gambar AI"));
    await waitFor(() => expect(generateImageMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Generate Gambar AI")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Generate Gambar AI"));
    await flushMicrotasks();

    expect(generateImageMock).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText("Pratinjau gambar terpilih")).toHaveAttribute(
      "src",
      "data:image/png;base64,HASIL",
    );
  });

  it("shows an error and keeps the original image when composing fails", async () => {
    const fetchMock = makeFetchMock(() => Promise.resolve(jsonResponse({ error: "Layanan AI sedang sibuk." }, false)));
    vi.stubGlobal("fetch", fetchMock);

    render(<GeneratePage />);
    await flushMicrotasks();
    await pickImage(olahAiImage.publicUrl);

    fireEvent.click(screen.getByText("Generate Gambar AI"));

    expect(await screen.findByText("Layanan AI sedang sibuk.")).toBeInTheDocument();
    expect(screen.getByAltText("Pratinjau gambar terpilih")).toHaveAttribute("src", olahAiImage.publicUrl);
  });
});
