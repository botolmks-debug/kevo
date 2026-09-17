"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type LogoOption = {
  style: "typography" | "icon" | "auto";
  label: string;
  logoDataUri: string;
  logoLightDataUri: string;
};

export function GenerateLogoButton({
  onSaved,
  hasExistingLogo = false,
}: {
  onSaved?: () => void;
  /** Sudah ada logo (dark/light) tersimpan — pengaruh ke label tombol & teks bantuan. */
  hasExistingLogo?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [options, setOptions] = useState<LogoOption[] | null>(null);
  const [wasFree, setWasFree] = useState(false);
  const [selected, setSelected] = useState<LogoOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadyHasLogo = hasExistingLogo || applied;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setApplied(false);
    setSelected(null);
    setOptions(null);
    try {
      const res = await fetch("/api/generate-logo", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal generate logo");
        return;
      }
      setOptions(data.options ?? []);
      setWasFree(!!data.wasFree);
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!selected) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-logo/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoDataUri: selected.logoDataUri,
          logoLightDataUri: selected.logoLightDataUri,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal menerapkan logo");
        return;
      }
      setApplied(true);
      setOptions(null);
      setSelected(null);
      onSaved?.();
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setApplying(false);
    }
  }

  function handleDownload(dataUri: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    a.click();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div>
        <p className="font-semibold text-navy text-sm">
          {alreadyHasLogo ? "Tidak puas dengan logo sekarang?" : "Belum punya logo?"}
        </p>
        <p className="text-xs text-navy/60">
          AI buatkan 3 opsi logo (Tipografi, Ikonik, Bebas AI) berdasarkan data usaha kamu.
          Pilih satu, lihat pratinjau, baru diterapkan.
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        onClick={handleGenerate}
        disabled={loading}
        className="self-start text-xs px-4 py-2"
      >
        {loading
          ? "Membuat 3 opsi logo..."
          : options || alreadyHasLogo
          ? "Generate Ulang (1 token)"
          : "Generate Logo Otomatis"}
      </Button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {options && options.length > 0 && !selected ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-navy/70">Pilih salah satu opsi:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {options.map((opt) => (
              <button
                key={opt.style}
                type="button"
                onClick={() => setSelected(opt)}
                className="flex flex-col gap-2 rounded-xl border border-line bg-slate-100 p-3 text-left transition hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={opt.logoDataUri} alt={opt.label} className="h-20 w-full object-contain" />
                <span className="text-xs font-semibold text-navy text-center">{opt.label}</span>
              </button>
            ))}
          </div>
          {wasFree ? (
            <p className="text-[11px] text-primary">Generate ini gratis (3 opsi sekaligus).</p>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-navy/70">
            Opsi terpilih: <span className="font-semibold">{selected.label}</span>{" "}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="ml-1 text-primary underline text-[11px]"
            >
              (ganti opsi)
            </button>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-[10px] text-navy/50 mb-1">Untuk latar terang</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.logoDataUri} alt="Logo versi gelap" className="max-h-20 w-full object-contain" />
              <button
                type="button"
                onClick={() => handleDownload(selected.logoDataUri, "logo.png")}
                className="mt-2 text-[11px] font-medium text-primary underline"
              >
                Download
              </button>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-[10px] text-white/60 mb-1">Untuk latar gelap</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.logoLightDataUri}
                alt="Logo versi terang"
                className="max-h-20 w-full object-contain"
              />
              <button
                type="button"
                onClick={() => handleDownload(selected.logoLightDataUri, "logo-terang.png")}
                className="mt-2 text-[11px] font-medium text-white underline"
              >
                Download
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="primary" onClick={handleApply} disabled={applying} className="text-xs px-4 py-2">
              {applying ? "Menerapkan..." : "Terapkan sebagai Logo"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelected(null);
                setOptions(null);
              }}
              disabled={applying}
              className="text-xs px-4 py-2"
            >
              Batal
            </Button>
          </div>
        </div>
      ) : null}

      {applied ? <p className="text-[11px] text-primary">Logo berhasil diterapkan.</p> : null}
    </div>
  );
}
