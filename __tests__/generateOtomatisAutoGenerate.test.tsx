// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoGenerate } from "@/app/generate-otomatis/AutoGenerate";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

const eligibleImage = {
  id: "img-1",
  description: "Kopi Susu Senja 250ml",
  category: "Produk",
  usage: "olah_ai",
  publicUrl: "https://cdn.example/produk.jpg",
};

const ineligibleImage = {
  id: "img-2",
  description: "Foto suasana kedai",
  category: "Suasana/Fasilitas",
  usage: "apa_adanya",
  publicUrl: "https://cdn.example/suasana.jpg",
};

const defaultPostItem = {
  id: "gen-1",
  jenis: "produk",
  imageUrl: "https://cdn.example/generated.png",
  onImageText: "Kopi Segar",
  caption: "Halo dari Kopi Senja!",
  ratio: "4:5",
  status: "draft",
  createdAt: "2026-01-02T00:00:00Z",
};

function defaultFetchMock(overrides: { items?: unknown[]; postResponse?: ReturnType<typeof jsonResponse> } = {}) {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/images") {
      return Promise.resolve(jsonResponse({ images: [eligibleImage, ineligibleImage] }));
    }
    if (url === "/api/generate-auto" && init?.method === "POST") {
      return Promise.resolve(overrides.postResponse ?? jsonResponse({ item: defaultPostItem }));
    }
    if (url === "/api/generate-auto") {
      return Promise.resolve(jsonResponse({ items: overrides.items ?? [] }));
    }
    if (url === defaultPostItem.imageUrl) {
      return Promise.resolve({ ok: true, blob: async () => new Blob(["fake-png"], { type: "image/png" }) });
    }
    if (url === "/api/render") {
      return Promise.resolve({ ok: true, blob: async () => new Blob(["fake-rendered-png"], { type: "image/png" }) });
    }
    if (url === `/api/generate-auto/${defaultPostItem.id}`) {
      return Promise.resolve(
        jsonResponse({
          item: { ...defaultPostItem, onImageText: "Kopi Segar (edit)" },
        }),
      );
    }
    return Promise.resolve(jsonResponse({}));
  });
}

describe("AutoGenerate", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows jenis options with Produk selected by default, and the image dropdown for Produk", async () => {
    vi.stubGlobal("fetch", defaultFetchMock());

    render(<AutoGenerate />);

    expect(screen.getByRole("radio", { name: /produk/i })).toBeChecked();
    expect(await screen.findByText("Kopi Susu Senja 250ml")).toBeInTheDocument();
  });

  it("only lists images that are category Produk and usage olah_ai", async () => {
    vi.stubGlobal("fetch", defaultFetchMock());

    render(<AutoGenerate />);

    await screen.findByText("Kopi Susu Senja 250ml");
    expect(screen.queryByText("Foto suasana kedai")).not.toBeInTheDocument();
  });

  it("shows an error and skips the request when generating 'produk' without picking an image", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");
    fetchMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));

    expect(await screen.findByText("Pilih gambar produk dulu.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates content, shows the result, and refreshes history", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/generate-auto",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ jenis: "produk", ratio: "4:5", imageId: "img-1" }),
        }),
      ),
    );

    expect(await screen.findByDisplayValue("Halo dari Kopi Senja!")).toBeInTheDocument();
  });

  it("switches to General, hides the image dropdown, and generates without picking an image", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.click(screen.getByRole("radio", { name: /general/i }));

    expect(screen.queryByLabelText("Gambar produk")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/generate-auto",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ jenis: "general", ratio: "4:5", imageId: undefined }),
        }),
      ),
    );
  });

  it("shows a friendly error message when generate fails", async () => {
    const fetchMock = defaultFetchMock({
      postResponse: jsonResponse({ error: "Layanan AI sedang sibuk, coba lagi." }, false),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));

    expect(await screen.findByText("Layanan AI sedang sibuk, coba lagi.")).toBeInTheDocument();
  });

  it("shows a 'Buka Gambar' link that opens the full-size image in a new tab", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));

    const link = await screen.findByRole("link", { name: "Buka Gambar" });
    expect(link).toHaveAttribute("href", defaultPostItem.imageUrl);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("downloads the PNG by fetching it and triggering a blob download", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download PNG" }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("copies the caption to the clipboard and shows a confirmation", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salin Caption" }));

    expect(writeText).toHaveBeenCalledWith(defaultPostItem.caption);
    expect(await screen.findByRole("button", { name: "Tersalin!" })).toBeInTheDocument();
  });

  it("opens the position/font editor, renders again, and saves the change", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock-rendered"), revokeObjectURL: vi.fn() });

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));
    await screen.findByDisplayValue("Halo dari Kopi Senja!");

    fireEvent.click(screen.getByRole("button", { name: "Edit Posisi & Font" }));
    expect(screen.getByTestId("canvas-editor-stub")).toBeInTheDocument();
    // tombol "Edit Posisi & Font" hilang selama editor terbuka.
    expect(screen.queryByRole("button", { name: "Edit Posisi & Font" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Render Ulang" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/render", expect.objectContaining({ method: "POST" })),
    );
    await screen.findByAltText("Pratinjau hasil render ulang");

    const saveButton = screen.getByRole("button", { name: "Simpan Perubahan" });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/generate-auto/${defaultPostItem.id}`,
        expect.objectContaining({ method: "PATCH" }),
      ),
    );

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === `/api/generate-auto/${defaultPostItem.id}` && (init as RequestInit | undefined)?.method === "PATCH",
    )!;
    const formData = (patchCall[1] as RequestInit).body as FormData;
    expect(formData.get("onImageText")).toBe("Kopi Segar");
    expect(formData.get("caption")).toBe("Halo dari Kopi Senja!");
    expect(formData.get("file")).toBeInstanceOf(Blob);

    expect(await screen.findByAltText("Kopi Segar (edit)")).toBeInTheDocument();
    expect(screen.queryByTestId("canvas-editor-stub")).not.toBeInTheDocument();
  });

  it("closes the editor without saving when 'Batal' is clicked", async () => {
    const fetchMock = defaultFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<AutoGenerate />);
    await screen.findByText("Kopi Susu Senja 250ml");

    fireEvent.change(screen.getByLabelText("Gambar produk"), { target: { value: "img-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Otomatis" }));
    await screen.findByDisplayValue("Halo dari Kopi Senja!");

    fireEvent.click(screen.getByRole("button", { name: "Edit Posisi & Font" }));
    expect(screen.getByTestId("canvas-editor-stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(screen.queryByTestId("canvas-editor-stub")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Posisi & Font" })).toBeInTheDocument();
  });

  it("shows history items fetched on mount", async () => {
    vi.stubGlobal(
      "fetch",
      defaultFetchMock({
        items: [
          {
            id: "gen-old",
            jenis: "general",
            imageUrl: "https://cdn.example/old.png",
            onImageText: "Cerita Lama",
            caption: "Caption lama",
            ratio: "1:1",
            status: "draft",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );

    render(<AutoGenerate />);

    expect(await screen.findByText("Caption lama")).toBeInTheDocument();
  });

  it("lets a history item's image be opened and its caption copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    vi.stubGlobal(
      "fetch",
      defaultFetchMock({
        items: [
          {
            id: "gen-old",
            jenis: "general",
            imageUrl: "https://cdn.example/old.png",
            onImageText: "Cerita Lama",
            caption: "Caption lama",
            ratio: "1:1",
            status: "draft",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );

    render(<AutoGenerate />);
    await screen.findByText("Caption lama");

    expect(screen.getByRole("link", { name: "Cerita Lama" })).toHaveAttribute(
      "href",
      "https://cdn.example/old.png",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Salin Caption" })[0]);
    expect(writeText).toHaveBeenCalledWith("Caption lama");
  });
});
