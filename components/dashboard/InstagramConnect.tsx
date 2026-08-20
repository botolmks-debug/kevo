"use client";
// components/dashboard/InstagramConnect.tsx
// Kartu di Dashboard: status koneksi Instagram + tombol Hubungkan / Putuskan.
// Tidak tampil sama sekali kalau fitur belum dibuka untuk user ini.
import { useEffect, useState } from "react";

type Status = {
  allowed: boolean;
  connected: boolean;
  username: string | null;
  pageName: string | null;
  expiresAt: string | null;
};

export default function InstagramConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/instagram/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    load();
    // Pesan hasil redirect dari callback (?ig=ok / ?ig=err&msg=...)
    const p = new URLSearchParams(window.location.search);
    const ig = p.get("ig");
    if (ig === "ok") setNotice("Instagram berhasil terhubung ✅");
    if (ig === "err") setNotice(p.get("msg") || "Gagal menghubungkan Instagram");
  }, []);

  if (!status || !status.allowed) return null;

  async function disconnect() {
    if (!confirm("Putuskan koneksi Instagram? Jadwal otomatis akan berhenti.")) return;
    setBusy(true);
    await fetch("/api/instagram/status", { method: "DELETE" });
    setBusy(false);
    setNotice(null);
    load();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Instagram</h3>
          {status.connected ? (
            <p className="mt-1 text-sm text-gray-600">
              Terhubung sebagai{" "}
              <span className="font-medium">@{status.username ?? "?"}</span>
              {status.pageName ? ` (Page: ${status.pageName})` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              Hubungkan akun Instagram Business untuk posting otomatis sesuai
              jadwal di halaman Jadwal.
            </p>
          )}
        </div>
        {status.connected ? (
          <button
            onClick={disconnect}
            disabled={busy}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Putuskan
          </button>
        ) : (
          <a
            href="/api/instagram/connect"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Hubungkan
          </a>
        )}
      </div>
      {notice && <p className="mt-3 text-sm text-teal-700">{notice}</p>}
      {!status.connected && (
        <p className="mt-3 text-xs text-gray-400">
          Syarat: akun IG Business/Creator yang tertaut ke Facebook Page.
        </p>
      )}
    </div>
  );
}
