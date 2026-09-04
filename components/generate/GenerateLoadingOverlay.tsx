"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Membaca profil bisnis kamu...",
  "Meracik ide konten...",
  "Menyiapkan gambar...",
  "Menulis caption...",
  "Menata tampilan akhir...",
];

type GenerateLoadingOverlayProps = {
  /** Pesan yang bergantian di bawah logo. Default ke tahapan generate umum. */
  messages?: string[];
  /** Dipanggil kalau user klik "Batalkan". Omit untuk sembunyikan tombolnya. */
  onCancel?: () => void;
};

export function GenerateLoadingOverlay({
  messages = DEFAULT_MESSAGES,
  onCancel,
}: GenerateLoadingOverlayProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      // fade out teks lama, ganti isi, fade in lagi
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 250);
      return () => clearTimeout(swap);
    }, 2600);
    return () => clearInterval(cycle);
  }, [messages.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy/55 backdrop-blur-[2px]"
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <img
          src="/keposty-icon.png"
          alt="Keposting"
          className="h-20 w-20 animate-logo-pulse drop-shadow-lg"
        />

        <p
          className={`min-h-[1.5rem] text-sm font-medium text-white transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {messages[index]}
        </p>

        {onCancel ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-white/70 underline underline-offset-2 transition hover:text-white"
            >
              Batalkan
            </button>
            <p className="text-[11px] text-white/40">
              Token tetap terpakai walau dibatalkan
            </p>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes logo-pulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.94);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
        }
        .animate-logo-pulse {
          animation: logo-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
