// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a Buat Konten card linking to /generate", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("link", { name: "Buat Konten" })).toHaveAttribute(
      "href",
      "/generate",
    );
  });

  it("shows the coming-soon feature placeholders", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Database Gambar")).toBeInTheDocument();
    expect(screen.getByText("Daftar Konten")).toBeInTheDocument();
    expect(screen.getByText("Editor Tata Letak")).toBeInTheDocument();
  });
});
