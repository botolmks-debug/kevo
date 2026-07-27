// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import OnboardingPage from "@/app/onboarding/page";

function goToStep(target: number) {
  for (let i = 1; i < target; i++) {
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  }
}

function mockSaveFetch(response: { ok: boolean; body: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.body,
  });
}

describe("OnboardingPage", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("starts at step 1 of 6 with a Lanjut button", () => {
    render(<OnboardingPage />);

    expect(screen.getByText("Langkah 1/6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjut" })).toBeInTheDocument();
  });

  it("advances through all 6 steps on Lanjut without navigating early", () => {
    render(<OnboardingPage />);

    for (let step = 2; step <= 6; step++) {
      fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
      expect(screen.getByText(`Langkah ${step}/6`)).toBeInTheDocument();
    }
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to /dashboard after completing the final step", async () => {
    vi.stubGlobal("fetch", mockSaveFetch({ ok: true, body: { ok: true } }));
    render(<OnboardingPage />);

    goToStep(6);
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows a friendly error and does not navigate when saving fails", async () => {
    vi.stubGlobal("fetch", mockSaveFetch({ ok: false, body: { error: "Gagal menyimpan profil bisnis." } }));
    render(<OnboardingPage />);

    goToStep(6);
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));

    expect(await screen.findByText("Gagal menyimpan profil bisnis.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("prevents selecting a 4th social platform for the footer once 3 are picked", () => {
    render(<OnboardingPage />);
    goToStep(4);

    fireEvent.change(screen.getByLabelText("Instagram"), { target: { value: "@klinik" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "+62812" } });
    fireEvent.change(screen.getByLabelText("Facebook"), { target: { value: "fb.klinik" } });
    fireEvent.change(screen.getByLabelText("TikTok"), { target: { value: "@tiktok.klinik" } });

    // Order follows SOCIAL_PLATFORMS: instagram, whatsapp, facebook, tiktok, ...
    const showCheckboxes = screen.getAllByLabelText("Tampilkan");
    fireEvent.click(showCheckboxes[0]);
    fireEvent.click(showCheckboxes[1]);
    fireEvent.click(showCheckboxes[2]);

    expect(showCheckboxes[0]).toBeChecked();
    expect(showCheckboxes[1]).toBeChecked();
    expect(showCheckboxes[2]).toBeChecked();

    fireEvent.click(showCheckboxes[3]);

    expect(showCheckboxes[3]).not.toBeChecked();
    expect(showCheckboxes[3]).toBeDisabled();
  });

  it("POSTs a structured businessProfile with only the selected socials on finish", async () => {
    const fetchMock = mockSaveFetch({ ok: true, body: { ok: true } });
    vi.stubGlobal("fetch", fetchMock);
    render(<OnboardingPage />);

    fireEvent.change(screen.getByLabelText("Nama bisnis"), { target: { value: "Klinik Sehat" } });
    goToStep(4);
    fireEvent.change(screen.getByLabelText("Instagram"), { target: { value: "@klinik" } });
    fireEvent.click(screen.getAllByLabelText("Tampilkan")[0]);
    // sudah di step 4 — 2 klik lagi untuk sampai step 6 (goToStep menghitung dari step 1).
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/business-profile");
    expect(JSON.parse(init.body)).toEqual(
      expect.objectContaining({
        business: expect.objectContaining({ name: "Klinik Sehat" }),
        socials: {
          entries: [{ platformId: "instagram", value: "@klinik" }],
          selectedPlatformIds: ["instagram"],
        },
      }),
    );
  });
});
