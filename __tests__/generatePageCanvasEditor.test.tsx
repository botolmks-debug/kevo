// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GeneratePage from "@/app/generate/page";

describe("GeneratePage canvas editor wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ profile: null }) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the preview panel with the CanvasEditor stub", () => {
    render(<GeneratePage />);

    expect(screen.getByRole("heading", { name: "Pratinjau & Atur Posisi" })).toBeInTheDocument();
    expect(screen.getByTestId("canvas-editor-stub")).toBeInTheDocument();
  });

  it("feeds text edits from the editor back into the matching form field", () => {
    render(<GeneratePage />);

    // Template default (Pengumuman) slot teks pertama adalah "headline".
    fireEvent.click(screen.getByRole("button", { name: "stub-edit-text" }));

    expect((screen.getByLabelText("Headline") as HTMLInputElement).value).toBe("Teks hasil edit kanvas");
  });

  it("includes the overridden template (from the editor) in the render request body", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/render") {
        return Promise.resolve({ ok: true, blob: async () => new Blob(["fake-png"], { type: "image/png" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ profile: null }) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });

    render(<GeneratePage />);

    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Judul" } });
    fireEvent.change(screen.getByLabelText("Isi"), { target: { value: "Detail pengumuman" } });
    fireEvent.click(screen.getByRole("button", { name: "stub-change-overrides" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/render", expect.objectContaining({ method: "POST" })),
    );

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const call = calls.find(([url]) => url === "/api/render")!;
    const body = JSON.parse(call[1].body as string);
    const headlineSlot = body.template.layouts["4:5"].slots.find((s: { id: string }) => s.id === "headline");
    expect(headlineSlot.fontFamily).toBe("Pacifico");
  });
});
