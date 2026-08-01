"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Ikon (?) kecil yang saat diklik/tap memunculkan penjelasan singkat.
 * Dibuat click-toggle (bukan hover) supaya jalan di HP juga. Klik di luar
 * menutup popover. stopPropagation dipakai agar tidak memicu klik elemen
 * induk (mis. kartu yang bisa diklik).
 */
export function HelpTip({
  text,
  title,
  align = "center",
}: {
  text: ReactNode;
  title?: string;
  align?: "left" | "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pos =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="Bantuan"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs font-bold leading-none text-navy/50 transition hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {open ? (
        <span
          className={`absolute top-7 z-30 w-64 max-w-[80vw] rounded-xl border border-line bg-white p-3 text-left text-xs font-normal leading-relaxed text-navy/80 shadow-lg ${pos}`}
        >
          {title ? <span className="mb-1 block font-semibold text-navy">{title}</span> : null}
          {text}
        </span>
      ) : null}
    </span>
  );
}
