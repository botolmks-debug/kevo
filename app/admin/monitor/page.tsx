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
};

export default function AdminMonitorPage() {
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
        const json = await res.json();
        setData(json);
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
    // Auto-refresh setiap 60 detik
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-slate-500">Memuat data monitoring...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <strong>Gagal load:</strong> {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monitoring</h1>
          <p className="text-sm text-slate-500">
            Diperbarui: {formatTime(data.timestamp)} (auto-refresh 60 detik)
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Error 24 jam"
          value={data.errors.count24h}
          highlight={data.errors.count24h > 5}
          highlightColor="red"
        />
        <StatCard
          label="Generate 24 jam"
          value={data.generate.count24h}
          sub={`Produk ${data.generate.byJenis.produk} · General ${data.generate.byJenis.general} · Interaksi ${data.generate.byJenis.interaksi}`}
        />
        <StatCard
          label="User aktif 24 jam"
          value={data.users.active24h}
          sub={`Total user: ${data.users.total} · Baru 7 hari: ${data.users.new7d}`}
        />
        <StatCard
          label="Token dipakai 24 jam"
          value={data.tokens.usage24h}
        />
      </div>

      {/* Recent errors */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Error terbaru
        </h2>
        {data.errors.recent.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada error tercatat 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {data.errors.recent.map((err) => (
              <div
                key={err.id}
                className="border-l-4 border-red-400 bg-red-50 pl-4 py-2 rounded"
              >
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span className="font-mono font-semibold text-red-700">
                    {err.route}
                    {err.provider && ` · ${err.provider}`}
                  </span>
                  <span>{formatTime(err.created_at)}</span>
                </div>
                <p className="text-sm text-slate-800 break-words">
                  {err.error_message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  highlightColor,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  highlightColor?: "red" | "amber";
}) {
  const highlightClass = highlight
    ? highlightColor === "red"
      ? "border-red-300 bg-red-50"
      : "border-amber-300 bg-amber-50"
    : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-5 ${highlightClass}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}