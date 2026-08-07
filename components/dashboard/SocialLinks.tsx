"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SOCIAL_PLATFORMS, MAX_SELECTED_SOCIALS } from "@/lib/social/platforms";
import { getLang, t, type Lang } from "@/lib/i18n";
import type { BusinessProfile, SocialEntry } from "@/lib/onboarding/businessProfile";

export function SocialLinks() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(getLang()); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/business-profile")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || !data?.profile) {
          setLoadError(data?.error ?? t("dash.social.errLoad", getLang()));
          return;
        }
        const p = data.profile as BusinessProfile;
        setProfile(p);
        const map: Record<string, string> = {};
        (p.socials?.entries ?? []).forEach((e) => {
          map[e.platformId] = e.value;
        });
        setValues(map);
        setSelected(p.socials?.selectedPlatformIds ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("dash.social.errLoad", getLang()));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSelected(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SELECTED_SOCIALS) return cur;
      return [...cur, id];
    });
  }

  async function handleSave() {
    if (!profile) return;
    setStatus("saving");
    setSaveError(null);

    const entries: SocialEntry[] = SOCIAL_PLATFORMS.filter(
      (p) => (values[p.id] ?? "").trim() !== "",
    ).map((p) => ({ platformId: p.id, value: values[p.id].trim() }));

    const selectedValid = selected.filter((id) => entries.some((e) => e.platformId === id));

    const updated: BusinessProfile = {
      ...profile,
      socials: { entries, selectedPlatformIds: selectedValid },
    };

    try {
      const res = await fetch("/api/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.social.errSave", lang));
      setSelected(selectedValid);
      setStatus("saved");
    } catch (error) {
      setStatus("error");
      setSaveError(error instanceof Error ? error.message : t("dash.social.errSave", lang));
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-navy">{t("dash.sec.social", lang)}</h3>
        <p className="text-sm text-navy/60">
          {t("dash.social.descA", lang)} {MAX_SELECTED_SOCIALS} {t("dash.social.descB", lang)}
        </p>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <div className="flex flex-col gap-2.5">
        {SOCIAL_PLATFORMS.map((p) => {
          const hasValue = (values[p.id] ?? "").trim() !== "";
          const isSelected = selected.includes(p.id);
          const disabledCheck = !isSelected && selected.length >= MAX_SELECTED_SOCIALS;
          return (
            <div key={p.id} className="flex items-center gap-3">
              <input
                type="text"
                value={values[p.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                placeholder={p.label}
                className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
              <label
                className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
                  hasValue ? "text-navy/70" : "text-navy/30"
                }`}
                title={hasValue ? t("dash.social.showTitle", lang) : t("dash.social.fillFirst", lang)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!hasValue || disabledCheck}
                  onChange={() => toggleSelected(p.id)}
                />
                {t("dash.social.show", lang)}
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={status === "saving"} className="w-fit">
          {status === "saving" ? t("dash.social.saving", lang) : t("dash.social.save", lang)}
        </Button>
        {status === "saved" ? <span className="text-sm font-medium text-primary">{t("dash.social.saved", lang)}</span> : null}
      </div>
      {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
    </Card>
  );
}