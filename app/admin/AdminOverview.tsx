"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type UsageEntry = { action: string | null; at: string };
type Row = {
  email: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  businessName: string | null;
  unlimited: boolean;
  tokens: number | null;
  usageCount: number;
  lastUsedAt: string | null;
  recentUsage: UsageEntry[];
};

function fmt(dt: string | null): string {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOverview() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error ?? "Gagal memuat data.");
        return d;
      })
      .then((d) => setRows(d.rows as Row[]))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;
  if (!rows) return <Card><p className="text-sm text-navy/60">Memuat...</p></Card>;
  if (rows.length === 0) return <Card><p className="text-sm text-navy/60">Belum ada user.</p></Card>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-navy/60">Total user: <b className="text-navy">{rows.length}</b></p>
      {rows.map((row) => (
        <Card key={row.email} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-navy">{row.email}</p>
              <p className="text-xs text-navy/60">{row.businessName ?? "(belum onboarding)"}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {row.unlimited ? "∞ token" : `${row.tokens ?? "-"} token`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/60">
            <span>Login terakhir: <b className="text-navy">{fmt(row.lastSignInAt)}</b></span>
            <span>Daftar: <b className="text-navy">{fmt(row.createdAt)}</b></span>
            <span>Pakai token: <b className="text-navy">{row.usageCount}×</b></span>
            <span>Terakhir pakai: <b className="text-navy">{fmt(row.lastUsedAt)}</b></span>
            {row.recentUsage.length > 0 ? (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setOpenEmail(openEmail === row.email ? null : row.email)}
              >
                {openEmail === row.email ? "Sembunyikan riwayat" : "Lihat riwayat pemakaian"}
              </button>
            ) : null}
          </div>

          {openEmail === row.email ? (
            <ul className="flex flex-col gap-1 border-t border-line pt-2 text-xs text-navy/70">
              {row.recentUsage.map((u, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{u.action ?? "AI"}</span>
                  <span className="tabular-nums text-navy/50">{fmt(u.at)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
