// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoSettings } from "@/app/dashboard/LogoSettings";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function fakeFile(name = "logo.png"): File {
  return new File(["dummy"], name, { type: "image/png" });
}

const existingLogo = { url: "https://cdn.example/dev/logo/abc.png", position: "top-left" as const };

describe("LogoSettings", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an empty state and 'Unggah Logo' when there is no logo yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ profile: { logo: null } })));

    render(<LogoSettings />);

    expect(await screen.findByText(/belum ada logo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unggah Logo" })).toBeInTheDocument();
  });

  it("shows the current logo, position picker, and 'Ganti Logo' when a logo exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ profile: { logo: existingLogo } })));

    render(<LogoSettings />);

    expect(await screen.findByAltText("Logo bisnis")).toHaveAttribute("src", existingLogo.url);
    expect(screen.getByRole("button", { name: "Ganti Logo" })).toBeInTheDocument();
    expect((screen.getByLabelText("Kiri atas") as HTMLInputElement).checked).toBe(true);
  });

  it("uploads a file and reloads the logo on success", async () => {
    let currentLogo: { url: string; position: string } | null = null;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        currentLogo = { url: "https://cdn.example/dev/logo/new.png", position: "top-left" };
        return Promise.resolve(jsonResponse({ url: currentLogo.url }));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: currentLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByText(/belum ada logo/i);

    fireEvent.change(screen.getByLabelText("Pilih file logo"), { target: { files: [fakeFile()] } });
    fireEvent.click(screen.getByRole("button", { name: "Unggah Logo" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/business-logo", expect.objectContaining({ method: "POST" })),
    );
    expect(await screen.findByAltText("Logo bisnis")).toHaveAttribute("src", "https://cdn.example/dev/logo/new.png");
  });

  it("shows a friendly message and skips the request when uploading with no file selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ profile: { logo: null } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByText(/belum ada logo/i);
    fetchMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Unggah Logo" }));

    expect(await screen.findByText("Pilih file logo dulu.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes the logo and returns to the empty state", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: existingLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByAltText("Logo bisnis");

    fireEvent.click(screen.getByRole("button", { name: "Hapus Logo" }));

    await waitFor(() => expect(screen.getByText(/belum ada logo/i)).toBeInTheDocument());
  });

  it("removes the background and reloads the logo with the new url", async () => {
    let currentLogo = existingLogo;
    const fetchMock = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/remove-background")) {
        currentLogo = { url: "https://cdn.example/dev/logo/clean.png", position: "top-left" };
        return Promise.resolve(jsonResponse({ url: currentLogo.url }));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: currentLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByAltText("Logo bisnis");

    fireEvent.click(screen.getByRole("button", { name: "Hapus Background" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/business-logo/remove-background", expect.objectContaining({ method: "POST" })),
    );
    await waitFor(() =>
      expect(screen.getByAltText("Logo bisnis")).toHaveAttribute("src", "https://cdn.example/dev/logo/clean.png"),
    );
  });

  it("shows a friendly error when removing the background fails", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/remove-background")) {
        return Promise.resolve(jsonResponse({ error: "Gagal menghapus background logo. Coba lagi." }, false));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: existingLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByAltText("Logo bisnis");

    fireEvent.click(screen.getByRole("button", { name: "Hapus Background" }));

    expect(await screen.findByText("Gagal menghapus background logo. Coba lagi.")).toBeInTheDocument();
  });

  it("changes position immediately (optimistic) and sends a PATCH request", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: existingLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByAltText("Logo bisnis");

    fireEvent.click(screen.getByLabelText("Kanan bawah"));

    expect((screen.getByLabelText("Kanan bawah") as HTMLInputElement).checked).toBe(true);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/business-logo",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ position: "bottom-right" }),
        }),
      ),
    );
  });

  it("reverts the position and shows an error when the PATCH request fails", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ error: "Gagal mengubah posisi logo. Coba lagi." }, false));
      }
      return Promise.resolve(jsonResponse({ profile: { logo: existingLogo } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoSettings />);
    await screen.findByAltText("Logo bisnis");

    fireEvent.click(screen.getByLabelText("Kanan bawah"));

    expect(await screen.findByText("Gagal mengubah posisi logo. Coba lagi.")).toBeInTheDocument();
    await waitFor(() => expect((screen.getByLabelText("Kiri atas") as HTMLInputElement).checked).toBe(true));
  });
});
