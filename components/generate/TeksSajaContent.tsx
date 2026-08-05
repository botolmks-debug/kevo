"use client";

import { getLang } from "@/lib/i18n";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { saveManualContent } from "@/lib/content/saveContent";
import { createTeksSajaTemplate } from "@/lib/templates/teks-saja";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

type Status = "idle" | "loading" | "success" | "error";

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "4:5", label: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)" },
  { value: "9:16", label: "Story (9:16)" },
];

// Preset warna: brand Keposting + beberapa pilihan umum yang aman untuk teks putih.
const COLOR_PRESETS = [
  { hex: "#0fb6a6", label: "Teal (brand)" },
  { hex: "#ff7a59", label: "Coral (brand)" },
  { hex: "#2a2a28", label: "Navy gelap" },
  { hex: "#111111", label: "Hitam" },
  { hex: "#4C1D95", label: "Ungu" },
  { hex: "#DC2626", label: "Merah" },
  { hex: "#1D4ED8", label: "Biru" },
  { hex: "#065F46", label: "Hijau tua" },
];

/** Bikin gambar 8x8px warna solid (client-side) — dipakai sebagai "photo" slot
 *  supaya reuse 100% jalur render foto yang sudah ada, tanpa kode baru. */
function solidColorDataUri(hex: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 8, 8);
  }
  return canvas.toDataURL("image/png");
}

export function TeksSajaContent({
  businessProfile,
  onBack,
}: {
  businessProfile: BusinessProfile | null;
  onBack: () => void;
}) {
  const [judul, setJudul] = useState("");
  const [descriptions, setDescriptions] = useState<string[]>([""]);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [bgColor, setBgColor] = useState("#0fb6a6");
  const [overrides, setOverrides] = useState<EditorOverrides>({ slots: {} });
  const [values, setValues] = useState<Record<string, string>>({});
  const [renderStatus, setRenderStatus] = useState<Status>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("idle");
  const [copiedCaption, setCopiedCaption] = useState(false);

  const descCount = descriptions.length;
  const showEditor = judul.trim().length > 0;

  function addDescription() {
    setDescriptions((d) => [...d, ""]);
  }
  function removeDescription(i: number) {
    setDescriptions((d) => (d.length <= 1 ? d : d.filter((_, idx) => idx !== i)));
  }
  function updateDescription(i: number, val: string) {
    setDescriptions((d) => d.map((x, idx) => (idx === i ? val : x)));
  }

  // Judul & deskripsi di sini cuma ISI AWAL — begitu editor tampil, edit
  // lanjutannya lewat dobel-klik langsung di kanvas (sama seperti model lain).
  function currentValues(): Record<string, string> {
    const nv: Record<string, string> = { title: judul, photo: solidColorDataUri(bgColor) };
    descriptions.forEach((d, i) => {
      nv[`desc-${i}`] = d;
    });
    return { ...nv, ...values };
  }

  async function handleGenerateCaption() {
    if (!businessProfile) return;
    setCaptionStatus("loading");
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: "Teks Saja",
          values: { Judul: judul, Deskripsi: descriptions.filter((d) => d.trim()).join(" ") },
          profile: businessProfile,
          language: getLang(),
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal.");
      setCaption(d.caption ?? "");
      setCaptionStatus("success");
    } catch {
      setCaptionStatus("error");
    }
  }

  const footerOverride = businessProfile?.socials?.entries?.length
    ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
    : null;

  const baseTemplate = createTeksSajaTemplate(descCount);
  const withFooter = footerOverride?.socials?.length
    ? withFooterOverride(baseTemplate, footerOverride.businessName, footerOverride.socials)
    : baseTemplate;
  const logoDark = businessProfile?.logo ?? null;
  const logoLight = businessProfile?.logoLight ?? null;
  const defaultLogoVariant: "dark" | "light" = logoLight ? "light" : "dark";
  const activeLogoVariant = overrides.logoVariant ?? defaultLogoVariant;
  const activeLogo = activeLogoVariant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);
  const template = withLogoOverride(withFooter, activeLogo);
  const editTemplate = applyEditorOverrides(template, ratio, overrides);
  const layout = editTemplate.layouts[ratio];
  const liveValues = currentValues();

  async function handleSimpanPng() {
    setRenderStatus("loading");
    setRenderError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, liveValues, ratio)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Gagal merender.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kevo-teks-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const { photo: _photo, ...textValues } = liveValues;
      const saved = await saveManualContent({
        pngBlob: blob,
        backgroundSrc: liveValues.photo ?? "",
        layoutState: {
          templateId: "teks-saja",
          ratio,
          values: textValues,
          overrides,
          logoVariant: activeLogoVariant,
          descCount,
          bgColor,
        },
        onImageText: liveValues.title ?? judul,
        caption,
        ratio,
        jenis: "produk",
        existingId: savedId,
      });
      if (saved.ok) setSavedId(saved.id);
      else setRenderError(`PNG terunduh, tapi gagal simpan ke Riwayat: ${saved.error}`);
      setRenderStatus("success");
    } catch (e) {
      setRenderStatus("error");
      setRenderError(e instanceof Error ? e.message : "Gagal.");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-navy/60 hover:text-navy">
          &larr; Model
        </button>
        <h1 className="text-xl font-bold text-navy">Teks Saja</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
        {/* KIRI: input */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">Teks Konten</h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-navy/60">Judul</span>
              <input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Judul konten"
                className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </label>
            {descriptions.map((d, i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="flex items-center justify-between text-xs font-medium text-navy/60">
                  <span>Deskripsi {i + 1}</span>
                  {descriptions.length > 1 ? (
                    <button type="button" onClick={() => removeDescription(i)} className="text-red-500 hover:underline">
                      Hapus
                    </button>
                  ) : null}
                </span>
                <textarea
                  value={d}
                  onChange={(e) => updateDescription(i, e.target.value)}
                  rows={2}
                  placeholder={`Deskripsi ${i + 1} (opsional)`}
                  className="resize-none rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </label>
            ))}
            <button type="button" onClick={addDescription} className="self-start text-xs font-medium text-primary hover:underline">
              + Tambah Deskripsi
            </button>
          </Card>

          <Card className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-navy">Warna Latar</h3>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setBgColor(c.hex)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    bgColor.toLowerCase() === c.hex.toLowerCase() ? "border-primary scale-110" : "border-line"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <label className="flex h-9 items-center gap-2 rounded-full border border-line px-2 text-xs text-navy/60">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                />
                Warna lain
              </label>
            </div>
          </Card>

          <Card className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-navy">Ukuran</h3>
            <div className="flex flex-wrap gap-2">
              {RATIO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRatio(opt.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    ratio === opt.value ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Caption Instagram</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateCaption}
                disabled={captionStatus === "loading" || !businessProfile}
                className="px-3 py-1.5 text-xs"
              >
                {captionStatus === "loading" ? "Membuat..." : "Generate"}
              </Button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Caption di sini, atau generate dari data bisnismu + judul/deskripsi"
              className="resize-none rounded-2xl border border-line px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
            {captionStatus === "error" ? <p className="text-xs text-red-600">Gagal membuat caption. Coba lagi.</p> : null}
            {caption ? (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(caption).catch(() => {});
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="self-start text-xs font-medium text-primary hover:underline"
              >
                {copiedCaption ? "Tersalin!" : "Salin Caption"}
              </button>
            ) : null}
          </Card>

          {showEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="cta" onClick={handleSimpanPng} disabled={renderStatus === "loading"}>
                {renderStatus === "loading" ? "Merender..." : "Simpan PNG"}
              </Button>
              {renderStatus === "success" ? <span className="text-sm font-medium text-primary">PNG Terunduh</span> : null}
              {renderError ? <p className="text-sm text-red-600">{renderError}</p> : null}
            </div>
          ) : null}
        </div>

        {/* KANAN: preview */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-medium text-navy/60">Preview - geser & edit langsung</p>
          {!showEditor ? (
            <div
              className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-navy/[0.02] p-8"
              style={{ minHeight: 300 }}
            >
              <p className="text-center text-xs text-navy/40">Isi Judul di kiri untuk mulai membuat konten.</p>
            </div>
          ) : (
            <CanvasEditor
              key={`${ratio}-${descCount}-${bgColor}`}
              layout={layout}
              values={liveValues}
              overrides={overrides}
              onOverridesChange={setOverrides}
              onTextChange={(slotId, val) => setValues((v) => ({ ...v, [slotId]: val }))}
              footerPreviewText={footerOverride?.socials?.[0]?.value}
              socials={footerOverride?.socials ?? []}
              businessName={businessProfile?.business.name}
              logoUrl={activeLogo?.url ?? null}
              logoVariant={activeLogoVariant}
              canToggleLogo={!!(logoDark && logoLight)}
              onLogoVariantChange={(v) => setOverrides((o) => ({ ...o, logoVariant: v }))}
            />
          )}
        </div>
      </div>
    </main>
  );
}
