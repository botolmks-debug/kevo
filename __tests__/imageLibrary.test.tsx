// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageLibrary } from "@/app/dashboard/ImageLibrary";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function fakeFile(name = "produk.jpg"): File {
  return new File(["dummy"], name, { type: "image/jpeg" });
}

describe("ImageLibrary", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads and groups images by category on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          images: [
            { id: "1", category: "Produk", description: "Ayam geprek", publicUrl: "https://cdn/1.jpg" },
            { id: "2", category: "Wajah/Orang", description: "Dokter", publicUrl: "https://cdn/2.jpg" },
          ],
        }),
      ),
    );

    render(<ImageLibrary />);

    expect(await screen.findByRole("heading", { name: "Produk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wajah / Orang" })).toBeInTheDocument();
    expect(screen.getByAltText("Ayam geprek")).toBeInTheDocument();
    expect(screen.getByAltText("Dokter")).toBeInTheDocument();
  });

  it("omits legacy 'Logo' category images instead of crashing, since logo now has its own dedicated slot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          images: [{ id: "1", category: "Logo", description: "Logo lama", publicUrl: "https://cdn/1.jpg" }],
        }),
      ),
    );

    render(<ImageLibrary />);
    await screen.findByRole("button", { name: "Unggah Gambar" });

    expect(screen.queryByAltText("Logo lama")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Logo" })).not.toBeInTheDocument();
  });

  it("shows a friendly error when the initial list load fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Gagal memuat daftar gambar. Coba lagi." }, false)));

    render(<ImageLibrary />);

    expect(await screen.findByText("Gagal memuat daftar gambar. Coba lagi.")).toBeInTheDocument();
  });

  it("blocks upload with a friendly message when no file is selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ images: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageLibrary />);
    await screen.findByRole("button", { name: "Unggah Gambar" });
    fetchMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Unggah Gambar" }));

    expect(await screen.findByText("Pilih file gambar dulu.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads the file with description/category/usage, then reloads and clears the form", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ image: { id: "new-1" } }));
      }
      return Promise.resolve(
        jsonResponse({
          images: [
            { id: "new-1", category: "Wajah/Orang", description: "Dokter baru", publicUrl: "https://cdn/new-1.jpg" },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageLibrary />);
    await screen.findByRole("button", { name: "Unggah Gambar" });

    fireEvent.change(screen.getByLabelText("Pilih file gambar"), { target: { files: [fakeFile()] } });
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "Dokter baru" } });
    fireEvent.change(screen.getByLabelText("Kategori"), { target: { value: "Wajah/Orang" } });
    fireEvent.click(screen.getByLabelText("Boleh diolah AI"));

    fireEvent.click(screen.getByRole("button", { name: "Unggah Gambar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/images", expect.objectContaining({ method: "POST" })));

    const [, init] = fetchMock.mock.calls.find(([, opts]) => opts?.method === "POST")!;
    const body = init!.body as FormData;
    expect(body.get("description")).toBe("Dokter baru");
    expect(body.get("category")).toBe("Wajah/Orang");
    expect(body.get("usage")).toBe("olah_ai");
    expect(body.get("file")).toBeInstanceOf(File);

    expect(await screen.findByAltText("Dokter baru")).toBeInTheDocument();
    expect((screen.getByLabelText("Deskripsi") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows a friendly error when the upload fails", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ error: "Gagal mengunggah gambar. Coba lagi." }, false));
      }
      return Promise.resolve(jsonResponse({ images: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageLibrary />);
    await screen.findByRole("button", { name: "Unggah Gambar" });

    fireEvent.change(screen.getByLabelText("Pilih file gambar"), { target: { files: [fakeFile()] } });
    fireEvent.click(screen.getByRole("button", { name: "Unggah Gambar" }));

    expect(await screen.findByText("Gagal mengunggah gambar. Coba lagi.")).toBeInTheDocument();
  });

  it("deletes an image via the API and reloads the list", async () => {
    let listedImages = [{ id: "img-1", category: "Produk", description: "Ayam geprek", publicUrl: "https://cdn/1.jpg" }];
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        listedImages = [];
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({ images: listedImages }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageLibrary />);
    await screen.findByAltText("Ayam geprek");

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/images/img-1", { method: "DELETE" }));
    await waitFor(() => expect(screen.queryByAltText("Ayam geprek")).not.toBeInTheDocument());
  });

  it("shows a friendly error when deletion fails", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ error: "Gagal menghapus gambar. Coba lagi." }, false));
      }
      return Promise.resolve(
        jsonResponse({ images: [{ id: "img-1", category: "Produk", description: "Ayam geprek", publicUrl: "https://cdn/1.jpg" }] }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageLibrary />);
    await screen.findByAltText("Ayam geprek");

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(await screen.findByText("Gagal menghapus gambar. Coba lagi.")).toBeInTheDocument();
    expect(screen.getByAltText("Ayam geprek")).toBeInTheDocument();
  });
});
