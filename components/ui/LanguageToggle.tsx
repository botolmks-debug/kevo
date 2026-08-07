"use client";

import { useEffect, useState } from "react";
import { getLang, setLang, t, type Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";

export function LanguageToggle() {
  const [lang, setL] = useState<Lang>("en");

  useEffect(() => setL(getLang()), []);

  function choose(next: Lang) {
    if (next === lang) return;
    setLang(next);
    setL(next);
    // Reload supaya menu & konteks ikut memakai bahasa baru.
    window.location.reload();
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-navy">{t("lang.title", lang)}</p>
        <p className="text-xs text-navy/60">{t("lang.desc", lang)}</p>
      </div>
      <div className="flex rounded-full border border-line p-1">
        <button
          type="button"
          onClick={() => choose("id")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${lang === "id" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}
        >
          Indonesia
        </button>
        <button
          type="button"
          onClick={() => choose("en")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${lang === "en" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}
        >
          English
        </button>
      </div>
    </Card>
  );
}
