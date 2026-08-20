"use client";
// components/content/AutoPostControl.tsx
// Kontrol per-konten: jam posting + toggle "Posting otomatis ke IG" + tombol "Posting sekarang".
// Pasang di kartu konten pada halaman /jadwal atau /konten.
// Props minimal supaya gampang disisipkan ke kode yang sudah ada.
import { useState } from "react";

type Props = {
  contentId: string;
  scheduledTime: string | null; // "HH:MM" atau null
  autoPost: boolean;
  postedAt: string | null; // ig_posted_at
  postError?: string | null;
  igConnected: boolean;
};

export default function AutoPostControl(props: Props) {
  const [time, setTime] = useState(props.scheduledTime ?? "09:00");
  const [auto, setAuto] = useState(props.autoPost);
  const [posted, setPosted] = useState(props.postedAt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(props.postError ?? null);

  async function save(nextAuto: boolean, nextTime: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/content/${props.contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPost: nextAuto, scheduledTime: nextTime }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error || "Gagal menyimpan jadwal");
      }
    } finally {
      setBusy(false);
    }
  }

  async function postNow() {
    if (!confirm("Posting konten ini ke Instagram sekarang?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: props.contentId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setPosted(new Date().toISOString());
        setMsg("Terposting ke Instagram ✅");
      } else {
        setMsg(j.error || "Gagal posting");
      }
    } finally {
      setBusy(false);
    }
  }

  if (posted) {
    return (
      <p className="mt-2 text-xs font-medium text-teal-700">
        ✅ Sudah terposting ke Instagram
      </p>
    );
  }

  if (!props.igConnected) {
    return (
      <p className="mt-2 text-xs text-gray-400">
        Hubungkan Instagram di Dashboard untuk posting otomatis.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          disabled={busy}
          onChange={(e) => {
            setTime(e.target.value);
            save(auto, e.target.value);
          }}
          className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={auto}
            disabled={busy}
            onChange={(e) => {
              setAuto(e.target.checked);
              save(e.target.checked, time);
            }}
          />
          Auto-post IG
        </label>
        <button
          onClick={postNow}
          disabled={busy}
          className="ml-auto rounded-lg border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          Posting sekarang
        </button>
      </div>
      {msg && <p className="text-xs text-amber-700">{msg}</p>}
    </div>
  );
}
