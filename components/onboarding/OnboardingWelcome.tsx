"use client";

/**
 * Popup sambutan di awal onboarding — menjelaskan TUJUAN pertanyaan
 * (supaya user tidak curiga datanya diperjualbelikan) sebelum form muncul.
 *
 * Cara pasang di halaman onboarding (2 baris):
 *   import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
 *   ...di dalam return, paling atas:  <OnboardingWelcome />
 * Komponen mengurus dirinya sendiri: muncul saat halaman dibuka,
 * hilang saat tombol ditekan, tidak muncul lagi di sesi yang sama.
 */
import { useEffect, useState } from "react";

export function OnboardingWelcome() {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Tampilkan sekali per sesi (kalau user refresh di tengah onboarding,
    // tidak disapa ulang).
    try {
      if (sessionStorage.getItem("kp-onboard-hello") === "1") return;
    } catch {
      /* sessionStorage bisa gagal di mode privat — tetap tampilkan */
    }
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setLeaving(true);
    try {
      sessionStorage.setItem("kp-onboard-hello", "1");
    } catch {
      /* abaikan */
    }
    setTimeout(() => setOpen(false), 250);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-6"
      style={{ animation: leaving ? "kpFadeOut .25s ease forwards" : "kpFadeIn .3s ease" }}
      role="dialog"
      aria-modal="true"
      aria-label="Selamat datang"
    >
      <style>{`
        @keyframes kpFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes kpFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes kpPopUp {
          0% { opacity: 0; transform: translateY(24px) scale(.96) }
          60% { opacity: 1; transform: translateY(-4px) scale(1.01) }
          100% { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes kpRise {
          from { opacity: 0; transform: translateY(10px) }
          to { opacity: 1; transform: translateY(0) }
        }
        .kp-rise-1 { animation: kpRise .4s ease .15s both }
        .kp-rise-2 { animation: kpRise .4s ease .3s both }
        .kp-rise-3 { animation: kpRise .4s ease .45s both }
      `}</style>

      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        style={{ animation: "kpPopUp .45s cubic-bezier(.2,.9,.3,1.2)" }}
      >
        <p className="kp-rise-1 text-2xl">👋</p>
        <h2 className="kp-rise-1 mt-2 text-xl font-bold text-navy">
          Halo, selamat datang di Keposting!
        </h2>

        <p className="kp-rise-2 mt-3 text-sm leading-relaxed text-navy/70">
          Sebelum mulai, kami mau kenalan dulu dengan bisnismu. Jawabanmu di
          beberapa pertanyaan berikut dipakai AI untuk membuat konten yang
          cocok dengan produk dan target market-mu.
        </p>

        <button
          type="button"
          onClick={close}
          className="kp-rise-3 mt-5 w-full rounded-full bg-cta px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Oke, mulai — cuma ±2 menit
        </button>
      </div>
    </div>
  );
}
