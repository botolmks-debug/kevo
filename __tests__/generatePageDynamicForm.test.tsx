// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GeneratePage from "@/app/generate/page";

describe("GeneratePage dynamic form", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the Pengumuman template's fields by default", () => {
    render(<GeneratePage />);

    expect(screen.getByLabelText("Headline")).toBeInTheDocument();
  });

  it("switches fields when the Rekrutmen template is selected", () => {
    render(<GeneratePage />);

    fireEvent.change(screen.getByLabelText("Template"), {
      target: { value: "rekrutmen" },
    });

    expect(screen.getByLabelText("Posisi 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Headline")).not.toBeInTheDocument();
  });

  it("switches fields when the Quote template is selected", () => {
    render(<GeneratePage />);

    fireEvent.change(screen.getByLabelText("Template"), {
      target: { value: "quote" },
    });

    expect(screen.getByLabelText("Kutipan")).toBeInTheDocument();
    expect(screen.queryByLabelText("Posisi 1")).not.toBeInTheDocument();
  });
});
