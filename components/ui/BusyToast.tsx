"use client";

import { useEffect, useState } from "react";
import { getLang } from "@/lib/i18n";

/**
 * Notifikasi kecil "AI sedang sibuk" — dipakai bersama oleh semua alur generate
 * (Otomatis, Standar, Carousel, dll). MUNCUL hanya kalau proses berjalan lebih
 * lama dari biasanya (default 12 detik), supaya generate cepat tidak
 * memunculkan notifikasi yang mengganggu. HILANG otomatis begitu `active`
 * kembali false (gambar/konten sudah jadi, atau error).
 *
 * Teks sengaja NETRAL — tidak menyebut nama penyedia AI mana pun.
 */
export function BusyToast({
  active,
  delayMs = 12000,
}: {
  active: boolean;
  delayMs?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  if (!show || !active) return null;

  const lang = getLang();
  const text =
    lang === "en"
      ? "Lots of people are creating right now — hang tight, your content is on the way…"
      : "Lagi ramai yang bikin konten nih, sebentar ya — kontenmu sedang disiapkan…";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-full border border-line bg-navy/90 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur"
    >
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span>{text}</span>
    </div>
  );
}
