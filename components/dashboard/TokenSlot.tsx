"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { t, getLang, type Lang } from "@/lib/i18n";

type RefillState = {
  unlimited: boolean;
  tokens: number | null;
  freeTokensCap: number;
  refilledJustNow: number;
  nextRefillAt: string | null;
};

const START_TOKENS = 5; // pre-launch: user baru mulai dari 5 token

/** Format sisa waktu ke "HH:MM:SS" untuk countdown refill harian. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function TokenSlot() {
  const [state, setState] = useState<RefillState | null>(null);
  const [lang, setLang] = useState<Lang>("id");
  // "Jam" internal untuk countdown — di-tick tiap detik selama nextRefillAt ada.
  const [nowMs, setNowMs] = useState(() => Date.now());

  function loadRefill() {
    fetch("/api/refill-check", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {});
  }

  useEffect(() => {
    setLang(getLang());
    loadRefill();
  }, []);

  // Countdown token harian: tick per detik; saat mencapai 0, cek ulang ke
  // server (refill +1 diklaim otomatis oleh /api/refill-check).
  const nextRefillMs = state?.nextRefillAt ? Date.parse(state.nextRefillAt) : null;
  useEffect(() => {
    if (!nextRefillMs) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextRefillMs]);
  useEffect(() => {
    if (nextRefillMs && nowMs >= nextRefillMs) loadRefill();
  }, [nextRefillMs, nowMs]);
  const countdownText = nextRefillMs && nextRefillMs > nowMs ? formatCountdown(nextRefillMs - nowMs) : null;

  const unlimited = state?.unlimited === true;
  const tokens = state?.tokens ?? null;
  const persen =
    tokens === null ? 100 : Math.max(0, Math.min(100, Math.round((tokens / START_TOKENS) * 100)));
  const habis = !unlimited && tokens !== null && tokens <= 0;
  const cap = state?.freeTokensCap ?? 5;
  const belowCap = !unlimited && tokens !== null && tokens < cap;
  const gotRefill = (state?.refilledJustNow ?? 0) > 0;
  const locale = lang === "en" ? "en-US" : "id-ID";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-navy">{t("token.title", lang)}</h2>
          <p className="text-sm text-navy/60">{t("token.desc", lang)}</p>
        </div>
        {unlimited ? (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {t("token.unlimited", lang)}
          </span>
        ) : habis ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
            {t("token.out", lang)}
          </span>
        ) : null}
      </div>

      {gotRefill && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          🎁 {t("token.refilledJustNow", lang)}
        </div>
      )}

      {state === null ? (
        <p className="text-sm text-navy/50">{t("token.loading", lang)}</p>
      ) : unlimited ? (
        <p className="text-3xl font-bold text-navy">{t("token.unlimitedFull", lang)}</p>
      ) : (
        <>
          <p className="text-3xl font-bold text-navy">
            {(tokens ?? 0).toLocaleString(locale)}
            <span className="text-base font-medium text-navy/50"> {t("token.tokensLeft", lang)}</span>
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${habis ? "bg-red-400" : "bg-primary"}`}
              style={{ width: `${persen}%` }}
            />
          </div>
          {habis ? (
            <div className="space-y-1">
              <p className="text-xs text-red-600">{t("token.outMsg", lang)}</p>
              <p className="text-xs text-navy/60">💡 {t("token.betaRefill", lang)}</p>
            </div>
          ) : belowCap ? (
            <p className="text-xs text-navy/60">💡 {t("token.betaRefill", lang)}</p>
          ) : (
            <p className="text-xs text-navy/50">{t("token.aiFeaturesInfo", lang)}</p>
          )}
          {countdownText ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              <span aria-hidden>⏳</span>
              <p className="text-xs font-medium text-navy/70">
                {lang === "en" ? "+1 free token in" : "+1 token gratis dalam"}{" "}
                <span className="font-mono text-sm font-bold tabular-nums text-primary">{countdownText}</span>
              </p>
            </div>
          ) : null}
          <Link
            href="/topup"
            className={`mt-1 w-fit rounded-full px-4 py-2 text-sm font-semibold transition ${
              habis
                ? "bg-coral text-white hover:opacity-90"
                : "border border-primary text-primary hover:bg-primary/5"
            }`}
          >
            {lang === "en" ? "Top Up Tokens" : "Top Up Token"} →
          </Link>
        </>
      )}
    </Card>
  );
}
