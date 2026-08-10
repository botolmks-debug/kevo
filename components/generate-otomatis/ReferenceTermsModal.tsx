"use client";

import { useState } from "react";
import { getLang, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "keposting_reference_tc_v1";

/**
 * Cek apakah user sudah pernah menerima T&C fitur Referensi.
 * Return false di server (SSR) untuk safety.
 */
export function hasAcceptedReferenceTerms(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * Tandai user sudah menerima T&C fitur Referensi.
 */
export function markReferenceTermsAccepted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
  } catch {
    // ignore
  }
}

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReferenceTermsModal({ open, onCancel, onConfirm }: Props) {
  const [checked, setChecked] = useState(false);
  const [lang, setLang] = useState<Lang>("id");

  // Read lang on mount (client only)
  useState(() => {
    if (typeof window !== "undefined") setLang(getLang());
  });

  if (!open) return null;

  const isEn = lang === "en";

  const T = {
    title: isEn ? "Reference Feature Terms" : "Ketentuan Penggunaan Fitur Referensi",
    intro: isEn
      ? "Before continuing, make sure your reference image meets these terms:"
      : "Sebelum melanjutkan, pastikan referensi yang kamu upload memenuhi ketentuan berikut:",
    points: isEn
      ? [
          "You have the right to use this reference image — your own photo, a work you're licensed to use, or a public domain image.",
          "You do NOT use photos from other brands, competitors, or professional photographers without permission.",
          "The reference is used only as visual style inspiration (composition, lighting, mood) — NOT to reproduce products, logos, or copyrighted elements of other brands.",
          "AI will use YOUR uploaded product — not copy the product in the reference.",
          "You are fully responsible for the generated content. Keposting is not liable for third-party copyright claims arising from inappropriate reference use.",
        ]
      : [
          "Kamu punya hak menggunakan gambar referensi ini — foto milik sendiri, karya yang kamu izinkan pakai, atau gambar dari public domain.",
          "Kamu TIDAK menggunakan foto milik brand lain, kompetitor, atau fotografer profesional tanpa izin.",
          "Referensi hanya dipakai sebagai inspirasi gaya visual (komposisi, pencahayaan, mood) — bukan untuk mereproduksi produk, logo, atau elemen berhak cipta dari brand lain.",
          "AI akan menggunakan produk yang kamu upload — bukan menyalin produk di referensi.",
          "Kamu bertanggung jawab penuh atas konten yang dihasilkan. Keposting tidak bertanggung jawab atas klaim hak cipta dari pihak ketiga akibat penggunaan referensi yang tidak sesuai.",
        ],
    agree: isEn ? "I understand and agree" : "Saya mengerti dan setuju",
    cancel: isEn ? "Cancel" : "Batal",
    confirm: isEn ? "Continue Generate" : "Lanjut Generate",
  };

  const handleConfirm = () => {
    if (!checked) return;
    markReferenceTermsAccepted();
    setChecked(false);
    onConfirm();
  };

  const handleCancel = () => {
    setChecked(false);
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-navy">{T.title}</h2>
        <p className="mt-2 text-sm text-navy/70">{T.intro}</p>

        <ol className="mt-4 space-y-2 text-sm text-navy/80">
          {T.points.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-primary">{i + 1}.</span>
              <span>{point}</span>
            </li>
          ))}
        </ol>

        <label className="mt-5 flex cursor-pointer items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-navy hover:border-primary/50">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>{T.agree}</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-surface"
          >
            {T.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!checked}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {T.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
