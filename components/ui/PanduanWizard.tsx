"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

// target = nilai data-tour pada menu header yang mau disorot.
type Step = { key: string; href: string; target: string };

const STEPS: Step[] = [
  { key: "s1", href: "/dashboard", target: "/dashboard" },
  { key: "s2", href: "/dashboard", target: "/dashboard" },
  { key: "s3", href: "/dashboard", target: "/dashboard" },
  { key: "s4", href: "/generate", target: "/generate-otomatis" },
  { key: "s5", href: "/generate-otomatis", target: "/generate-otomatis" },
  { key: "s6", href: "/konten", target: "/konten" },
  { key: "s7", href: "/jadwal", target: "/jadwal" },
];

const TIP_W = 340;

export function PanduanWizard({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const target = STEPS[step]?.target;
    function measure() {
      const el = target ? document.querySelector(`[data-tour="${target}"]`) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          return;
        }
      }
      setRect(null);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function close() {
    setStep(0);
    onClose();
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("panduan.badge", lang)}</p>
          <p className="text-xs text-navy/50">
            {t("panduan.step", lang)} {step + 1} {t("panduan.of", lang)} {STEPS.length}
          </p>
        </div>
        <button type="button" onClick={close} aria-label={t("panduan.close", lang)} className="rounded-full p-1 text-navy/40 hover:bg-navy/5 hover:text-navy">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-navy/10"}`} />
        ))}
      </div>

      <h2 className="mt-4 text-lg font-bold text-navy">
        {step + 1}. {t(`panduan.${s.key}.title`, lang)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy/70">{t(`panduan.${s.key}.desc`, lang)}</p>

      <Link
        href={s.href}
        onClick={close}
        className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        {t(`panduan.${s.key}.btn`, lang)} →
      </Link>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" onClick={close} className="text-sm text-navy/40 hover:text-navy/70 hover:underline">
          {t("panduan.skip", lang)}
        </button>
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((v) => v - 1)}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-navy/70 hover:bg-navy/5"
            >
              {t("panduan.back", lang)}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (isLast ? close() : setStep((v) => v + 1))}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {isLast ? t("panduan.done", lang) : t("panduan.next", lang)}
          </button>
        </div>
      </div>
    </>
  );

  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const tipLeft = rect ? Math.min(Math.max(rect.left + rect.width / 2 - TIP_W / 2, 12), vw - TIP_W - 12) : 0;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={close} />
      {rect ? (
        <>
          <div
            className="pointer-events-none fixed rounded-xl border-2 border-primary"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
          />
          <div
            className="fixed rounded-2xl bg-white p-5 shadow-xl"
            style={{ top: rect.top + rect.height + 14, left: tipLeft, width: TIP_W }}
            onClick={(e) => e.stopPropagation()}
          >
            {body}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {body}
          </div>
        </div>
      )}
    </div>
  );
}
