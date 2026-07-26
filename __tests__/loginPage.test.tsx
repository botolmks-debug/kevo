// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the heading and both auth actions linking to onboarding", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: /selamat datang/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/onboarding");
  });

  it("switches to the Daftar tab and shows a Daftar action", () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));

    expect(screen.getByRole("link", { name: "Daftar" })).toHaveAttribute("href", "/onboarding");
  });

  it("shows a confirmation message after requesting a password reset", () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Lupa Password" }));
    fireEvent.click(screen.getByRole("button", { name: "Kirim Tautan Reset" }));

    expect(screen.getByText(/tautan reset password sudah kami kirim/i)).toBeInTheDocument();
  });
});
