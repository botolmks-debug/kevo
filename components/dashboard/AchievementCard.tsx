"use client";

/**
 * Kartu Achievement di Dashboard: badge peringkat saat ini, progress menuju
 * peringkat berikutnya, deretan 6 badge (yang belum tercapai tampil redup),
 * dan pesan selamat kalau ada hadiah token yang baru cair.
 * Data + pemberian hadiah dari GET /api/achievements (idempoten di server).
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import AchievementBadge from "@/components/achievements/AchievementBadge";
import { TIERS, type Tier } from "@/lib/achievements/tiers";

type ApiTier = { id: string; label: string; days: number; reward: number; color: string; achieved: boolean };
type ApiResponse = {
  activeDays: number;
  tier: { id: string; label: string; color: string } | null;
  next: { id: string; label: string; days: number; sisa: number; reward: number } | null;
  tiers: ApiTier[];
  newlyGranted: { tier: string; tokens: number }[];
};

function tierById(id: string | undefined | null): Tier | null {
  return TIERS.find((t) => t.id === id) ?? null;
}

export function AchievementCard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null; // achievement bersifat pelengkap — jangan ganggu Dashboard kalau gagal
  if (!data) {
    return (
      <Card className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-full bg-navy/10" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-32 animate-pulse rounded bg-navy/10" />
          <div className="h-3 w-44 animate-pulse rounded bg-navy/10" />
        </div>
      </Card>
    );
  }

  const current = tierById(data.tier?.id);
  const next = data.next;
  const progressPct = next
    ? Math.min(100, Math.round((data.activeDays / next.days) * 100))
    : 100;

  return (
    <Card className="flex flex-col gap-4">
      {data.newlyGranted.length > 0 ? (
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {data.newlyGranted.map((g) => (
            <p key={g.tier}>
              🎉 Selamat! Kamu mencapai peringkat <strong>{g.tier}</strong> — +{g.tokens} token gratis sudah masuk.
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <AchievementBadge tier={current} size={56} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold text-navy">
            {current ? `Peringkat: ${current.label}` : "Belum ada peringkat"}
          </p>
          <p className="text-xs text-navy/60">
            {data.activeDays} hari aktif bikin konten
            {next ? ` — ${next.sisa} hari lagi menuju ${next.label}${next.reward > 0 ? ` (+${next.reward} token)` : ""}` : " — peringkat tertinggi tercapai! 🏆"}
          </p>
          {next ? (
            <>
              <div className="mt-1 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-navy/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-navy/50">
                {next.reward > 0
                  ? `Hadiah ${next.label}: +${next.reward} token gratis \u{1F381}`
                  : `${next.label} = badge pertama di akunmu \u{1F6E1}\uFE0F`}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* Deretan semua badge — yang belum tercapai tampil redup. */}
      <div className="flex flex-wrap items-end gap-3">
        {data.tiers.map((t) => {
          const tier = tierById(t.id);
          return (
            <div key={t.id} className="flex flex-col items-center gap-0.5" style={{ opacity: t.achieved ? 1 : 0.45 }}>
              <AchievementBadge tier={tier} size={36} />
              <span className="text-[10px] font-medium text-navy/60">{t.label}</span>
              <span className="text-[9px] text-navy/40">{t.days} hari</span>
              {/* Hadiah di tiap peringkat, terlihat langsung di deretan badge */}
              {t.reward > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-px text-[9px] font-semibold ${
                    t.achieved ? "bg-primary/15 text-primary" : "bg-navy/5 text-navy/50"
                  }`}
                >
                  {t.achieved ? "\u2713 " : ""}+{t.reward} token
                </span>
              ) : (
                <span className="text-[9px] text-navy/30">badge</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
