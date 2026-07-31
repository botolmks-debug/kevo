// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Header } from "@/components/ui/Header";

describe("Header", () => {
  afterEach(() => {
    cleanup();
  });

  it("links to the dashboard and generate routes", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Generate" })).toHaveAttribute(
      "href",
      "/generate",
    );
    expect(screen.getByRole("link", { name: "Generate Otomatis" })).toHaveAttribute(
      "href",
      "/generate-otomatis",
    );
  });

  it("logo links back to the dashboard", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Kevo" })).toHaveAttribute("href", "/dashboard");
  });
});
