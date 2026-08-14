"use client";

import { useEffect, useState } from "react";

type MonitorData = {
  timestamp: string;
  errors: {
    count24h: number;
    recent: Array<{
      id: string;
      route: string;
      provider: string | null;
      error_message: string;
      created_at: string;
    }>;
  };
  generate: {
    count24h: number;
    byJenis: Record<string, number>;
  };
  users: {
    active24h: number;
    new7d: number;
    total: number;
  };
  tokens: {
    usage24h: number;
  };
  capacity?: {
    storageBytes: number | null;
    storageLimitBytes: number;
    dbBytes: number | null;
    dbLimitBytes: number;
  };
};

function formatBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Bar kapasitas: hijau <60%, kuning 60-80%, merah >80% (saatnya planning upgrade). */
function CapacityBar({ label, used, limit }: { label: string; used: number | null; limit: number }) {
  if (used === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</p>
        <p className="text-xs text-slate-500">Tidak tersedia (cek migration db_size_bytes / izin storage)</p>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const warn = pct >= 80;
  const caution = pct >= 60 && pct < 80;
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-xs font-bold ${warn ? "text-red-700" : caution ? "text-amber-600" : "text-slate-700"}`}>{pct}%</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${warn ? "bg-red-500" : caution ? "bg-amber-400" : "bg-teal-500"}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 mt-1">
        {formatBytes(used)} dari {formatBytes(limit)} (free tier)
        {warn ? " — ⚠️ siapkan upgrade Supabase Pro" : ""}
      </p>
    </div>
  );
}

export default function MonitorSection() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/monitor", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        setData(null);
      } else {
        setData(await res.json());
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !data) {
    return <p className="text-slate-500 text-sm">Memuat monitoring...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
        <strong>Monitoring gagal load:</strong> {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Monitoring</h2>
          <p className="text-xs text-slate-500">
            Diperbarui: {formatTime(data.timestamp)} · auto-refresh 60 detik
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Error 24 jam"
          value={data.errors.count24h}
          highlight={data.errors.count24h > 5}
        />
        <StatCard
          label="Generate 24 jam"
          value={data.generate.count24h}
          sub={`P${data.generate.byJenis.produk} · G${data.generate.byJenis.general} · I${data.generate.byJenis.interaksi}`}
        />
        <StatCard
          label="User aktif 24 jam"
          value={data.users.active24h}
          sub={`Total: ${data.users.total} · Baru 7hr: ${data.users.new7d}`}
        />
        <StatCard
          label="Token 24 jam"
          value={data.tokens.usage24h}
        />
      </div>

      {data.capacity ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CapacityBar label="Storage Supabase" used={data.capacity.storageBytes} limit={data.capacity.storageLimitBytes} />
          <CapacityBar label="Database Supabase" used={data.capacity.dbBytes} limit={data.capacity.dbLimitBytes} />
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Error terbaru
        </h3>
        {data.errors.recent.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada error 🎉</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.errors.recent.map((err) => (
              <div
                key={err.id}
                className="border-l-4 border-red-400 bg-red-50 pl-3 py-2 rounded text-xs"
              >
                <div className="flex items-center justify-between text-slate-600 mb-0.5">
                  <span className="font-mono font-semibold text-red-700">
                    {err.route}
                    {err.provider && ` · ${err.provider}`}
                  </span>
                  <span>{formatTime(err.created_at)}</span>
                </div>
                <p className="text-slate-800 break-words">{err.error_message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
