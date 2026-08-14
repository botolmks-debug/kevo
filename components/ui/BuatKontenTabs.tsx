"use client";

// ── Sub-menu "Buat Konten" ────────────────────────────────────────────
// Satu menu Buat Konten di header, di dalamnya dua tab:
//   Otomatis (/generate-otomatis) — default, nilai jual Keposting
//   Manual   (/generate)          — pilihan model manual
// Dipasang di atas kedua halaman itu supaya user gampang pindah mode.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLang, t, type Lang } from "@/lib/i18n";

const TABS = [
  { href: "/generate-otomatis", key: "buat.tab.otomatis" },
  { href: "/generate", key: "buat.tab.manual" },
];

export function BuatKontenTabs() {
  const pathname = usePathname();
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { setLangState(getLang()); }, []);

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white/70 p-1 self-start">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-primary text-white" : "text-navy/60 hover:bg-navy/5 hover:text-navy"
            }`}
          >
            {t(tab.key, lang)}
          </Link>
        );
      })}
    </div>
  );
}
