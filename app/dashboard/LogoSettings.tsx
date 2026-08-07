"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileButton } from "@/components/ui/FileButton";
import { Card } from "@/components/ui/Card";
import { getLang, t, type Lang } from "@/lib/i18n";
import type { BusinessLogo, LogoPosition } from "@/lib/onboarding/businessProfile";

type Status = "idle" | "loading" | "error" | "success";
type LogoVariant = "dark" | "light";

const POSITION_OPTIONS: { value: LogoPosition; key: string }[] = [
  { value: "top-left", key: "dash.logo.posTL" },
  { value: "top-right", key: "dash.logo.posTR" },
  { value: "bottom-left", key: "dash.logo.posBL" },
  { value: "bottom-right", key: "dash.logo.posBR" },
];

const VARIANT_INFO: Record<LogoVariant, { labelKey: string; hintKey: string; bg: string }> = {
  dark: { labelKey: "dash.logo.dark", hintKey: "dash.logo.darkHint", bg: "bg-slate-100" },
  light: { labelKey: "dash.logo.light", hintKey: "dash.logo.lightHint", bg: "bg-slate-800" },
};

interface LogoCardProps {
  variant: LogoVariant;
  logo: BusinessLogo | null;
  onReload: () => void;
  lang: Lang;
}

function LogoCard({ variant, logo, onReload, lang }: LogoCardProps) {
  const info = VARIANT_INFO[variant];
  const label = t(info.labelKey, lang);
  const [uploadStatus, setUploadStatus] = useState<Status>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<Status>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [positionStatus, setPositionStatus] = useState<Status>("idle");
  const [removeBgStatus, setRemoveBgStatus] = useState<Status>("idle");
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);

  // Upload OTOMATIS begitu file dipilih — tanpa perlu klik tombol terpisah.
  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setUploadStatus("loading");
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("variant", variant);
      const res = await fetch("/api/business-logo", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.logo.uploadErr", lang));
      setUploadStatus("success");
      onReload();
    } catch (e) {
      setUploadStatus("error");
      setUploadError(e instanceof Error ? e.message : t("dash.logo.uploadErr", lang));
    }
  }

  async function handleDelete() {
    setDeleteStatus("loading"); setDeleteError(null);
    try {
      const res = await fetch(`/api/business-logo?variant=${variant}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.logo.deleteErr", lang));
      setDeleteStatus("success"); onReload();
    } catch (e) {
      setDeleteStatus("error");
      setDeleteError(e instanceof Error ? e.message : t("dash.logo.deleteErr", lang));
    }
  }

  async function handleRemoveBackground() {
    setRemoveBgStatus("loading"); setRemoveBgError(null);
    try {
      const res = await fetch("/api/business-logo/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.logo.removeBgErr", lang));
      setRemoveBgStatus("success"); onReload();
    } catch (e) {
      setRemoveBgStatus("error");
      setRemoveBgError(e instanceof Error ? e.message : t("dash.logo.removeBgErr", lang));
    }
  }

  async function handlePosition(position: LogoPosition) {
    setPositionStatus("loading");
    try {
      const res = await fetch("/api/business-logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, variant }),
      });
      if (!res.ok) throw new Error(t("dash.logo.posErr", lang));
      setPositionStatus("success"); onReload();
    } catch {
      setPositionStatus("error");
    }
  }

  const isUploading = uploadStatus === "loading";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div>
        <p className="font-semibold text-navy text-sm">{label}</p>
        <p className="text-xs text-navy/60">{t(info.hintKey, lang)}</p>
      </div>

      {logo ? (
        <>
          <div className={`flex items-center justify-center rounded-xl p-4 ${info.bg}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.url} alt={label} className="max-h-20 max-w-[160px] object-contain" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-navy/60">{t("dash.logo.position", lang)}</span>
            <div className="flex flex-wrap gap-2">
              {POSITION_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => handlePosition(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    logo.position === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line text-navy hover:bg-navy/5"
                  }`}>
                  {t(opt.key, lang)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FileButton accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              disabled={isUploading}
              label={isUploading ? t("dash.logo.uploading", lang) : t("dash.logo.replace", lang)} />
            <Button type="button" variant="secondary" onClick={handleRemoveBackground}
              disabled={removeBgStatus === "loading"} className="text-xs px-3 py-1.5">
              {removeBgStatus === "loading" ? t("dash.logo.removingBg", lang) : t("dash.logo.removeBg", lang)}
            </Button>
            <Button type="button" variant="secondary" onClick={handleDelete} disabled={deleteStatus === "loading"} className="text-xs px-3 py-1.5">
              {deleteStatus === "loading" ? t("dash.logo.deleting", lang) : t("dash.logo.delete", lang)}
            </Button>
          </div>
          <p className="text-xs text-navy/40">{t("dash.logo.removeBgHint", lang)}</p>
          {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}
          {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
          {removeBgError ? <p className="text-xs text-red-600">{removeBgError}</p> : null}
        </>
      ) : (
        <>
          <div className={`flex items-center justify-center rounded-xl p-4 ${info.bg} min-h-[80px]`}>
            <p className="text-xs text-navy/40">
              {isUploading ? t("dash.logo.uploading", lang) : t("dash.logo.none", lang)}
            </p>
          </div>
          <FileButton accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            disabled={isUploading}
            label={isUploading ? t("dash.logo.uploading", lang) : `${t("dash.logo.choose", lang)} ${label}`} />
          {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
        </>
      )}
    </div>
  );
}

export function LogoSettings() {
  const [logoDark, setLogoDark] = useState<BusinessLogo | null>(null);
  const [logoLight, setLogoLight] = useState<BusinessLogo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(getLang()); }, []);

  async function loadLogos() {
    setLoadError(null);
    try {
      const res = await fetch("/api/business-profile");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.logo.loadErr", getLang()));
      setLogoDark(data?.profile?.logo ?? null);
      setLogoLight(data?.profile?.logoLight ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("dash.logo.loadErr", getLang()));
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/business-profile")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) { setLoadError(data?.error ?? t("dash.logo.loadErr", getLang())); return; }
        setLogoDark(data?.profile?.logo ?? null);
        setLogoLight(data?.profile?.logoLight ?? null);
      })
      .catch(() => { if (!cancelled) setLoadError(t("dash.logo.loadErr", getLang())); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-navy">{t("dash.logo.section", lang)}</h3>
        <p className="text-sm text-navy/60">{t("dash.logo.desc", lang)}</p>
      </div>
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <LogoCard variant="dark" logo={logoDark} onReload={loadLogos} lang={lang} />
        <LogoCard variant="light" logo={logoLight} onReload={loadLogos} lang={lang} />
      </div>
    </Card>
  );
}
