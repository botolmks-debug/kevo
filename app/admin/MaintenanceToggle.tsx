"use client";

import { useEffect, useState } from "react";

export function MaintenanceToggle() {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((d) => { setOn(d.maintenance ?? false); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggle() {
    setSaving(true);
    const next = !on;
    await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maintenance: next }),
    });
    setOn(next);
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-navy/50">Memuat status…</p>;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-navy/10 bg-white p-5">
      <div className="flex-1">
        <p className="font-bold text-navy">Mode Maintenance</p>
        <p className="text-sm text-navy/60 mt-0.5">
          {on
            ? "🔴 AKTIF — hanya admin yang bisa login. User biasa diarahkan ke halaman maintenance."
            : "🟢 NONAKTIF — aplikasi berjalan normal untuk semua user."}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
          on
            ? "bg-red-100 text-red-700 hover:bg-red-200"
            : "bg-primary text-white hover:opacity-90"
        }`}
      >
        {saving ? "Menyimpan…" : on ? "Nonaktifkan" : "Aktifkan Maintenance"}
      </button>
    </div>
  );
}
