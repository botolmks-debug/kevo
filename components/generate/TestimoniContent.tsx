"use client";

import { getLang } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { saveManualContent } from "@/lib/content/saveContent";
import { createTestimoniTemplate, starsText, GOLD } from "@/lib/templates/model-testimoni";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; usage: string; publicUrl: string };

type TestimoniItem = {
  text: string;
  name: string;
  /** 1-5, atau null = tanpa bintang (baris bintang tidak ditampilkan sama sekali). */
  rating: number | null;
};

const MAX_TESTIMONI = 5;

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "4:5", label: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)" },
  { value: "9:16", label: "Story (9:16)" },
];

const OVERLAY_PRESETS = ["#000000", "#0f172a", "#134e4a", "#7c2d12", "#4c1d95", "#831843"];

/** Ukuran kanvas per rasio (lebar selalu 1080). */
const CANVAS_H: Record<AspectRatio, number> = { "4:5": 1350, "1:1": 1080, "9:16": 1920 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function TestimoniContent({
  businessProfile,
  onBack,
}: {
  businessProfile: BusinessProfile | null;
  onBack: () => void;
}) {
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PickableImage | null>(null);
  const [items, setItems] = useState<TestimoniItem[]>([{ text: "", name: "", rating: 5 }]);
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [overlayOpacity, setOverlayOpacity] = useState(55); // 0-100
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [overrides, setOverrides] = useState<EditorOverrides>({ slots: {} });
  const [values, setValues] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null); // dataUri hasil komposit latar+overlay
  const [buildStatus, setBuildStatus] = useState<Status>("idle");
  const [buildError, setBuildError] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<Status>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("idle");
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    fetch("/api/images").then((r) => r.json()).then((d) => setImages(d.images ?? [])).catch(() => {});
  }, []);

  // ── Testimoni list ────────────────────────────────────────────────────────
  function setItemAt(i: number, patch: Partial<TestimoniItem>) {
    setItems((arr) => arr.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    if (items.length >= MAX_TESTIMONI) return;
    setItems((arr) => [...arr, { text: "", name: "", rating: 5 }]);
  }
  function removeItem(i: number) {
    if (items.length <= 1) return;
    setItems((arr) => arr.filter((_, k) => k !== i));
  }

  const filledItems = items.filter((it) => it.text.trim().length > 0);
  const canBuild = !!selectedImage && filledItems.length > 0;

  // ── Komposit latar + overlay warna (client-side, pola Carousel) ──────────
  async function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal memuat gambar latar."));
      img.src = src;
    });
  }

  async function compositeBackground(): Promise<string> {
    if (!selectedImage) throw new Error("Pilih gambar dulu.");
    const img = await loadImg(selectedImage.publicUrl);
    const W = 1080;
    const H = CANVAS_H[ratio];
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");

    // Gambar cover (isi penuh, kelebihan terpotong).
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

    // Overlay warna dengan opacity pilihan user (dibake langsung).
    const { r, g, b } = hexToRgb(overlayColor);
    ctx.fillStyle = `rgba(${r},${g},${b},${overlayOpacity / 100})`;
    ctx.fillRect(0, 0, W, H);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  // Susun template + values dari daftar testimoni, lalu tampilkan editor.
  async function handleBuild() {
    if (!canBuild) return;
    setBuildStatus("loading");
    setBuildError(null);
    setSavedId(null);
    try {
      const dataUri = await compositeBackground();
      const nv: Record<string, string> = { photo: dataUri, title: values.title?.trim() || "Kata Mereka" };
      filledItems.forEach((it, i) => {
        if (it.rating != null) nv[`stars-${i}`] = starsText(it.rating);
        nv[`text-${i}`] = `"${it.text.trim()}"`;
        nv[`name-${i}`] = it.name.trim() ? `- ${it.name.trim()}` : "";
      });
      setValues(nv);
      setPhoto(dataUri);
      setOverrides({ slots: {} }); // reset posisi saat susunan slot berubah
      setBuildStatus("success");
    } catch (e) {
      setBuildStatus("error");
      setBuildError(e instanceof Error ? e.message : "Gagal menyusun konten.");
    }
  }

  async function handleGenerateCaption() {
    if (!businessProfile) return;
    setCaptionStatus("loading");
    try {
      const isi = filledItems
        .map((it) => `"${it.text.trim()}"${it.name.trim() ? ` - ${it.name.trim()}` : ""}`)
        .join(" | ");
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: "Testimoni Pelanggan",
          values: { Judul: values.title?.trim() || "Kata Mereka", Testimoni: isi },
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

  // ── Template & editor ─────────────────────────────────────────────────────
  const starsList = filledItems.map((it) => it.rating);
  const footerOverride = businessProfile?.socials?.entries?.length
    ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
    : null;

  const baseTemplate = createTestimoniTemplate(starsList.length ? starsList : [null]);
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

  async function handleSimpanPng() {
    const bg = values.photo;
    if (!bg) {
      setRenderStatus("error");
      setRenderError("Susun konten dulu sebelum menyimpan.");
      return;
    }
    setRenderStatus("loading");
    setRenderError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, values, ratio)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Gagal merender.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keposting-testimoni-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const { photo: _photo, ...textValues } = values;
      const saved = await saveManualContent({
        pngBlob: blob,
        // Latar yang disimpan = hasil komposit (overlay sudah dibake) —
        // Edit Konten tinggal memakainya apa adanya tanpa komposit ulang.
        backgroundSrc: bg,
        layoutState: {
          templateId: "testimoni",
          ratio,
          values: textValues,
          overrides,
          logoVariant: activeLogoVariant,
          testimoniStars: starsList,
        },
        onImageText: values.title?.trim() || "Kata Mereka",
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
        <h1 className="text-xl font-bold text-navy">Testimoni Pelanggan</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
        {/* KIRI: input */}
        <div className="flex flex-col gap-4">
          {/* Judul */}
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">Judul</h3>
            <input
              value={values.title ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="Kata Mereka"
              className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </Card>

          {/* Daftar testimoni */}
          <Card className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-navy">Testimoni ({items.length}/{MAX_TESTIMONI})</h3>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-navy/60">Testimoni {i + 1}</span>
                  {items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={it.text}
                  onChange={(e) => setItemAt(i, { text: e.target.value })}
                  rows={2}
                  placeholder="Isi testimoni pelanggan..."
                  className="resize-none rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
                <input
                  value={it.name}
                  onChange={(e) => setItemAt(i, { name: e.target.value })}
                  placeholder="Nama pelanggan (mis. Bu Rina)"
                  className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
                {/* Rating bintang OPSIONAL: kalau "Tanpa" dipilih, baris
                    bintang tidak muncul sama sekali di konten. */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs text-navy/60">Rating:</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setItemAt(i, { rating: n })}
                      className="px-0.5 text-xl leading-none"
                      style={{ color: it.rating != null && n <= it.rating ? GOLD : "#d1d5db" }}
                      aria-label={`${n} bintang`}
                    >
                      {"\u2605"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setItemAt(i, { rating: null })}
                    className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${
                      it.rating == null ? "border-primary bg-primary/10 text-primary" : "border-line text-navy/60"
                    }`}
                  >
                    Tanpa bintang
                  </button>
                </div>
              </div>
            ))}
            {items.length < MAX_TESTIMONI ? (
              <button type="button" onClick={addItem} className="self-start text-xs font-medium text-primary hover:underline">
                + Tambah Testimoni
              </button>
            ) : null}
          </Card>

          {/* Ukuran */}
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

          {/* Pilih gambar latar */}
          <Card className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-navy">Gambar Latar</h3>
            {images.length === 0 ? (
              <p className="text-xs text-navy/50">Belum ada gambar. Upload dulu di Dashboard.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                      selectedImage?.id === img.id ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.publicUrl} alt={img.description} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Overlay warna */}
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">Warna Overlay Latar</h3>
            <div className="flex flex-wrap items-center gap-2">
              {OVERLAY_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setOverlayColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${overlayColor === c ? "border-primary" : "border-line"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Warna ${c}`}
                />
              ))}
              <label className="flex items-center gap-1 text-xs text-navy/60">
                <input
                  type="color"
                  value={overlayColor}
                  onChange={(e) => setOverlayColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-line"
                />
                Warna lain
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-navy/60">Kepekatan overlay: {overlayOpacity}%</span>
              <input
                type="range"
                min={0}
                max={90}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              />
            </label>
            <p className="text-xs text-navy/40">
              Overlay menggelapkan/mewarnai latar supaya teks testimoni terbaca jelas.
            </p>
          </Card>

          {/* Aksi susun */}
          <div className="flex flex-col gap-2">
            <Button type="button" variant="cta" onClick={handleBuild} disabled={!canBuild || buildStatus === "loading"}>
              {buildStatus === "loading" ? "Menyusun..." : photo ? "Susun Ulang Konten" : "Susun Konten"}
            </Button>
            {!selectedImage ? <p className="text-xs text-navy/50">Pilih gambar latar dulu.</p> : null}
            {selectedImage && filledItems.length === 0 ? (
              <p className="text-xs text-navy/50">Isi minimal 1 testimoni.</p>
            ) : null}
            {buildError ? <p className="text-sm text-red-600">{buildError}</p> : null}
            {photo ? (
              <p className="text-xs text-navy/40">
                Ganti isi/warna? Ubah lalu tekan &quot;Susun Ulang Konten&quot; — posisi geseran di kanvas ikut di-reset.
              </p>
            ) : null}
          </div>

          {/* Auto-caption */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Caption Instagram</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateCaption}
                disabled={captionStatus === "loading" || !businessProfile || filledItems.length === 0}
                className="px-3 py-1.5 text-xs"
              >
                {captionStatus === "loading" ? "Membuat..." : "Generate"}
              </Button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Caption di sini, atau generate dari testimoni + data bisnismu"
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

          {/* Simpan */}
          {photo ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="cta" onClick={handleSimpanPng} disabled={renderStatus === "loading"}>
                {renderStatus === "loading" ? "Merender..." : "Simpan Gambar"}
              </Button>
              {renderStatus === "success" ? <span className="text-sm font-medium text-primary">PNG Terunduh</span> : null}
              {renderError ? <p className="text-sm text-red-600">{renderError}</p> : null}
            </div>
          ) : null}
        </div>

        {/* KANAN: preview */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-medium text-navy/60">Preview - geser & edit langsung</p>
          {!photo ? (
            <div
              className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-navy/[0.02] p-8"
              style={{ minHeight: 300 }}
            >
              <p className="text-center text-xs text-navy/40">
                Isi testimoni, pilih gambar latar & warna overlay, lalu tekan &quot;Susun Konten&quot;.
              </p>
            </div>
          ) : (
            <CanvasEditor
              key={`${photo.slice(-20)}-${starsList.map((s) => s ?? "x").join("")}`}
              layout={layout}
              values={values}
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
