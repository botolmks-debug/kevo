// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import OnboardingPage from "@/app/onboarding/page";

describe("OnboardingPage", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockClear();
  });

  it("starts at step 1 of 3 with a Lanjut button", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Langkah 1/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjut" })).toBeInTheDocument();
  });

  it("advances through steps 2 and 3 on Lanjut without navigating yet", () => {
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByText("Langkah 2/3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByText("Langkah 3/3")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to /dashboard after completing the final step", () => {
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
