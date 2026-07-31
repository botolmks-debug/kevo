"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  imageUrl: string;
  onImageText: string;
  caption: string;
  scheduledDate?: string | null;
};

/** Tanggal hari ini (waktu lokal) sebagai YYYY-MM-DD. */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ContentReminderBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/generate-auto")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);

  const today = todayStr();
  const due = items.filter((i) => i.scheduledDate === today);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white hover:bg-primary/5"
        aria-label="Pengingat konten hari ini"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {due.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {due.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-line bg-white p-3 shadow-lg">
          <p className="mb-2 text-sm font-semibold text-navy">Konten untuk hari ini</p>
          {due.length === 0 ? (
            <p className="text-xs text-navy/50">Tidak ada konten terjadwal hari ini.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {due.map((i) => (
                <li key={i.id}>
                  <Link href="/konten" className="flex items-center gap-2 rounded-xl p-1 hover:bg-primary/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.imageUrl} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" />
                    <span className="line-clamp-2 text-xs text-navy/70">{i.onImageText || i.caption || "Konten"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/konten" className="mt-2 block text-xs font-medium text-primary hover:underline">
            Buka Edit Konten
          </Link>
        </div>
      ) : null}
    </div>
  );
}
