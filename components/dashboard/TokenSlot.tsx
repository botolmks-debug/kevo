"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type TokenState = { unlimited: boolean; tokens: number | null };

const START_TOKENS = 10;

export function TokenSlot() {
  const [state, setState] = useState<TokenState | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => {});
  }, []);

  const unlimited = state?.unlimited === true;
  const tokens = state?.tokens ?? null;
  const persen = tokens === null ? 100 : Math.max(0, Math.min(100, Math.round((tokens / START_TOKENS) * 100)));
  const habis = !unlimited && tokens !== null && tokens <= 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-navy">Token AI</h2>
          <p className="text-sm text-navy/60">Dipakai tiap pakai fitur AI (potong 1 per aksi).</p>
        </div>
        {unlimited ? (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Unlimited</span>
        ) : habis ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">Habis</span>
        ) : null}
      </div>

      {state === null ? (
        <p className="text-sm text-navy/50">Memuat...</p>
      ) : unlimited ? (
        <p className="text-3xl font-bold text-navy">Tak terbatas</p>
      ) : (
        <>
          <p className="text-3xl font-bold text-navy">
            {(tokens ?? 0).toLocaleString("id-ID")}
            <span className="text-base font-medium text-navy/50"> token tersisa</span>
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div className={`h-full rounded-full ${habis ? "bg-red-400" : "bg-primary"}`} style={{ width: `${persen}%` }} />
          </div>
          {habis ? (
            <p className="text-xs text-red-600">Token habis — fitur AI (generate & potong background) tidak bisa dipakai sampai diisi ulang.</p>
          ) : (
            <p className="text-xs text-navy/50">Fitur AI: potong background, Generate AI, Generate Otomatis, Generate caption.</p>
          )}
        </>
      )}
    </Card>
  );
}
