"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type GenerateLogoResult = {
  logoUrl: string;
  logoLightUrl: string;
  wasFree: boolean;
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
  const [preview, setPreview] = useState<GenerateLogoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadyHasLogo = hasExistingLogo || !!preview;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-logo", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Gagal generate logo");
        return;
      }
      setPreview(data);
      onSaved?.();
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div>
        <p className="font-semibold text-navy text-sm">
          {alreadyHasLogo ? "Tidak puas dengan logo sekarang?" : "Belum punya logo?"}
        </p>
        <p className="text-xs text-navy/60">
          AI buatkan logo otomatis berdasarkan data usaha kamu — langsung terpasang untuk
          versi terang & gelap sekaligus.
        </p>
      </div>

      <Button type="button" variant="primary" onClick={handleGenerate} disabled={loading} className="self-start text-xs px-4 py-2">
        {loading ? "Membuat logo..." : alreadyHasLogo ? "Generate Ulang (1 token)" : "Generate Logo Otomatis"}
      </Button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {preview ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-[10px] text-navy/50 mb-1">Untuk latar terang</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.logoUrl} alt="Logo versi gelap" className="max-h-16 w-full object-contain" />
          </div>
          <div className="rounded-xl bg-slate-800 p-3">
            <p className="text-[10px] text-white/60 mb-1">Untuk latar gelap</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.logoLightUrl} alt="Logo versi terang" className="max-h-16 w-full object-contain" />
          </div>
        </div>
      ) : null}

      {preview?.wasFree ? (
        <p className="text-[11px] text-primary">
          Generate pertama gratis. Generate ulang berikutnya potong 1 token.
        </p>
      ) : null}
    </div>
  );
}
