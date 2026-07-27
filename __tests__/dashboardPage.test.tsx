// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ images: [] }) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a Buat Konten card linking to /generate", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("link", { name: "Buat Konten" })).toHaveAttribute(
      "href",
      "/generate",
    );
  });

  it("shows the real image upload section, not a coming-soon placeholder", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Database Gambar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unggah Gambar" })).toBeInTheDocument();
  });

  it("keeps only the remaining features as coming-soon placeholders", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Daftar Konten")).toBeInTheDocument();
    expect(screen.getByText("Editor Tata Letak")).toBeInTheDocument();
    expect(screen.getAllByText("Segera hadir")).toHaveLength(2);
  });
});
