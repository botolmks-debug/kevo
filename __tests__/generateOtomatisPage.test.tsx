// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GenerateOtomatisPage from "@/app/generate-otomatis/page";

describe("GenerateOtomatisPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ images: [] }) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the header and the AutoGenerate section", () => {
    render(<GenerateOtomatisPage />);

    expect(screen.getByRole("link", { name: "Generate Otomatis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generate Otomatis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Otomatis" })).toBeInTheDocument();
  });
});
