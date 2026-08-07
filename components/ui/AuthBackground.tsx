"use client";

import type { Lang } from "@/lib/i18n";

/**
 * Latar animasi untuk halaman auth: kata-kata gaya caption yang muncul-hilang
 * melayang pelan di belakang kartu. Murni CSS (tanpa timer JS). Diletakkan di
 * belakang konten (z-0) dengan opasitas rendah supaya kartu tetap terbaca.
 * Frasa mengikuti bahasa terpilih (id/en).
 */
const CAPTIONS = [
  { id: "Promo hari ini!", en: "Today's promo!", top: "12%", left: "9%", size: "1.6rem", delay: 0, dur: 7, accent: false },
  { id: "Diskon spesial", en: "Special discount", top: "20%", left: "70%", size: "1.4rem", delay: 1.6, dur: 8, accent: true },
  { id: "Stok terbatas", en: "Limited stock", top: "66%", left: "12%", size: "1.25rem", delay: 0.8, dur: 9, accent: false },
  { id: "Best seller", en: "Best seller", top: "76%", left: "66%", size: "1.7rem", delay: 2.3, dur: 7.5, accent: true },
  { id: "Baru datang!", en: "Just arrived!", top: "40%", left: "5%", size: "1.25rem", delay: 3.1, dur: 8.5, accent: false },
  { id: "Gratis ongkir", en: "Free shipping", top: "50%", left: "78%", size: "1.4rem", delay: 1.1, dur: 9.5, accent: false },
  { id: "Hanya minggu ini", en: "This week only", top: "86%", left: "38%", size: "1.1rem", delay: 2.7, dur: 8, accent: true },
  { id: "Ready stock", en: "In stock", top: "7%", left: "48%", size: "1.2rem", delay: 3.6, dur: 7, accent: false },
  { id: "Jangan kehabisan", en: "Don't miss out", top: "58%", left: "34%", size: "1.15rem", delay: 4.2, dur: 9, accent: false },
];

export function AuthBackground({ lang = "en" }: { lang?: Lang }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes kevoCaptionFloat {
            0%   { opacity: 0; transform: translateY(14px) scale(0.94); }
            18%  { opacity: 0.5; }
            50%  { opacity: 0.5; transform: translateY(-6px) scale(1); }
            82%  { opacity: 0.5; }
            100% { opacity: 0; transform: translateY(-18px) scale(1.03); }
          }
          @media (prefers-reduced-motion: reduce) {
            .kevo-caption { animation: none !important; opacity: 0.25 !important; }
          }
        `,
        }}
      />
      {CAPTIONS.map((c, i) => (
        <span
          key={i}
          className={`kevo-caption absolute font-bold ${c.accent ? "text-accent/40" : "text-primary/35"}`}
          style={{
            top: c.top,
            left: c.left,
            fontSize: c.size,
            opacity: 0,
            animation: `kevoCaptionFloat ${c.dur}s ease-in-out ${c.delay}s infinite`,
          }}
        >
          {lang === "en" ? c.en : c.id}
        </span>
      ))}
    </div>
  );
}
