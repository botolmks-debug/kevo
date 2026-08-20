"use client";

// app/instagram/pilih/page.tsx
// Halaman pilih akun Instagram saat 1 akun Meta punya >1 akun IG Business.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Akun = {
  igUserId: string;
  igUsername: string;
  pageId: string;
  pageName: string;
};

export default function PilihAkunIgPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Akun[] | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const res = await fetch("/api/instagram/pending", { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(
            j?.error === "expired"
              ? "Sesi pemilihan kedaluwarsa. Silakan ulangi hubungkan Instagram dari Dashboard."
              : "Gagal memuat daftar akun."
          );
        }
        const j = await res.json();
        if (aktif) setAccounts(j.accounts || []);
      } catch (e) {
        if (aktif) setError(e instanceof Error ? e.message : "Gagal memuat");
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  async function pilih(igUserId: string) {
    setSavingId(igUserId);
    setError("");
    try {
      const res = await fetch("/api/instagram/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igUserId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || "Gagal menyimpan pilihan");
      }
      router.replace("/dashboard?ig=ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan pilihan");
      setSavingId("");
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Pilih Akun Instagram</h1>
      <p className="mt-2 text-sm text-slate-600">
        Akun Meta kamu terhubung ke lebih dari satu akun Instagram Business. Pilih
        satu yang mau dipakai untuk auto-post.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <button
            onClick={() => router.replace("/dashboard")}
            className="underline font-medium"
          >
            Kembali ke Dashboard
          </button>
        </div>
      )}

      {accounts === null && !error && (
        <p className="mt-6 text-sm text-slate-500">Memuat daftar akun…</p>
      )}

      {accounts && accounts.length === 0 && !error && (
        <p className="mt-6 text-sm text-slate-500">
          Tidak ada akun ditemukan. Ulangi hubungkan Instagram dari Dashboard.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {(accounts || []).map((a) => (
          <button
            key={a.igUserId}
            onClick={() => pilih(a.igUserId)}
            disabled={!!savingId}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-400 hover:shadow disabled:opacity-60"
          >
            <div className="font-semibold text-slate-900">
              @{a.igUsername || a.igUserId}
            </div>
            <div className="text-xs text-slate-500">Page: {a.pageName}</div>
            {savingId === a.igUserId && (
              <div className="mt-1 text-xs text-teal-600">Menghubungkan…</div>
            )}
          </button>
        ))}
      </div>
    </main>
  );
}
