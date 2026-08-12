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
import { createCarouselTemplate } from "@/lib/templates/carousel";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; usage: string; publicUrl: string };
type Slide = { title: string; desc: string };

/** Harga fitur Carousel (tampilan tombol) — server pakai konstanta yang sama. */
const CAROUSEL_TOKEN_COST = 4;
const SLIDE_COUNT = 4;
const USER_PHOTO_COUNT = 3; // slide 1-3 foto user; slide 4 gambar AI

// Preset warna overlay: brand Keposting + pilihan umum yang aman untuk teks putih.
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

/** Muat gambar jadi HTMLImageElement. URL remote lewat fetch->blob (hindari
 *  canvas tainted); data: URI langsung dipakai sebagai src. */
async function loadImg(src: string): Promise<HTMLImageElement> {
  let objectUrl: string | null = null;
  const finalSrc = src.startsWith("data:")
    ? src
    : await fetch(src, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error("Gagal memuat gambar.");
          return r.blob();
        })
        .then((b) => (objectUrl = URL.createObjectURL(b)));
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.src = finalSrc;
    });
  } finally {
    // objectUrl dilepas SETELAH decode selesai (onload sudah terpanggil).
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 5000);
  }
}

/**
 * Komposit: foto (cover 1080x1350) + kotak overlay warna dengan opacity.
 * Overlay DIBAKE ke gambar supaya preview editor (HTML img) dan render Satori
 * menampilkan hasil yang persis sama, tanpa kode dekorasi baru.
 */
function compositeOverlay(img: HTMLImageElement, hex: string, opacityPct: number): string {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  // Cover: skala terbesar supaya kanvas penuh, gambar di tengah.
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  // Kotak overlay warna penuh kanvas.
  ctx.globalAlpha = Math.min(1, Math.max(0, opacityPct / 100));
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  // JPEG cukup (tanpa transparansi) — jauh lebih kecil dari PNG untuk foto.
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function CarouselContent({
  businessProfile,
  onBack,
}: {
  businessProfile: BusinessProfile | null;
  onBack: () => void;
}) {
  const [images, setImages] = useState<PickableImage[]>([]);
  // Urutan klik = urutan slide (badge 1-3 di thumbnail).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [overlayColor, setOverlayColor] = useState("#0fb6a6");
  const [overlayOpacity, setOverlayOpacity] = useState(80);

  const [genStatus, setGenStatus] = useState<Status>("idle");
  const [genError, setGenError] = useState<string | null>(null);

  // Sumber MENTAH per slide (URL foto user / dataUri AI) — dipisah dari hasil
  // komposit supaya ganti warna/opacity bisa re-komposit tanpa generate ulang.
  const [rawSrcs, setRawSrcs] = useState<string[] | null>(null);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);

  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [caption, setCaption] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);
  const [overridesPerSlide, setOverridesPerSlide] = useState<EditorOverrides[]>(
    Array.from({ length: SLIDE_COUNT }, () => ({ slots: {} })),
  );
  // Edit teks langsung di kanvas, per slide (values = satu sumber kebenaran).
  const [valuesPerSlide, setValuesPerSlide] = useState<Record<string, string>[]>(
    Array.from({ length: SLIDE_COUNT }, () => ({})),
  );
  const [savedIds, setSavedIds] = useState<(string | null)[]>(Array.from({ length: SLIDE_COUNT }, () => null));

  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState(0);

  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((d) => setImages(d.images ?? []))
      .catch(() => {});
  }, []);

  // Re-komposit semua slide saat sumber/warna/opacity berubah.
  useEffect(() => {
    if (!rawSrcs) return;
    let cancelled = false;
    (async () => {
      try {
        const next: string[] = [];
        for (const src of rawSrcs) {
          const img = await loadImg(src);
          next.push(compositeOverlay(img, overlayColor, overlayOpacity));
        }
        if (!cancelled) setBackgrounds(next);
      } catch {
        if (!cancelled) setGenError("Gagal memproses overlay gambar. Coba lagi.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawSrcs, overlayColor, overlayOpacity]);

  function toggleImage(id: string) {
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= USER_PHOTO_COUNT) return ids;
      return [...ids, id];
    });
  }

  async function handleGenerate() {
    if (selectedIds.length !== USER_PHOTO_COUNT) return;
    setGenStatus("loading");
    setGenError(null);
    try {
      const res = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: getLang() }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal generate carousel.");

      const gotSlides = (d?.slides ?? []) as Slide[];
      const ctaImage = d?.ctaImageDataUri as string | undefined;
      if (gotSlides.length !== SLIDE_COUNT || !ctaImage) {
        throw new Error("Hasil AI tidak lengkap. Coba lagi.");
      }

      const picked = selectedIds
        .map((id) => images.find((img) => img.id === id))
        .filter((img): img is PickableImage => !!img);
      if (picked.length !== USER_PHOTO_COUNT) throw new Error("Gambar terpilih tidak ditemukan.");

      setSlides(gotSlides);
      setCaption((d?.caption as string) ?? "");
      setRawSrcs([...picked.map((p) => p.publicUrl), ctaImage]);
      // Reset state editor untuk carousel baru.
      setOverridesPerSlide(Array.from({ length: SLIDE_COUNT }, () => ({ slots: {} })));
      setValuesPerSlide(Array.from({ length: SLIDE_COUNT }, () => ({})));
      setSavedIds(Array.from({ length: SLIDE_COUNT }, () => null));
      setActiveSlide(0);
      setGenStatus("success");
    } catch (e) {
      setGenStatus("error");
      setGenError(e instanceof Error ? e.message : "Gagal generate carousel.");
    }
  }

  const footerOverride = businessProfile?.socials?.entries?.length
    ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
    : null;

  const baseTemplate = createCarouselTemplate();
  const withFooter = footerOverride?.socials?.length
    ? withFooterOverride(baseTemplate, footerOverride.businessName, footerOverride.socials)
    : baseTemplate;
  const logoDark = businessProfile?.logo ?? null;
  const logoLight = businessProfile?.logoLight ?? null;
  const defaultLogoVariant: "dark" | "light" = logoLight ? "light" : "dark";

  const ready = slides !== null && backgrounds.length === SLIDE_COUNT;

  function slideValues(i: number): Record<string, string> {
    const base: Record<string, string> = {
      photo: backgrounds[i] ?? "",
      title: slides?.[i]?.title ?? "",
      "desc-0": slides?.[i]?.desc ?? "",
    };
    return { ...base, ...valuesPerSlide[i] };
  }

  const activeOverrides = overridesPerSlide[activeSlide];
  const activeLogoVariant = activeOverrides.logoVariant ?? defaultLogoVariant;
  const activeLogo = activeLogoVariant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);

  async function handleSimpanSemua() {
    if (!ready) return;
    setSaveStatus("loading");
    setSaveError(null);
    setSaveProgress(0);
    const newSavedIds = [...savedIds];
    try {
      // Berurutan (bukan paralel) supaya server render tidak kebanjiran.
      for (let i = 0; i < SLIDE_COUNT; i++) {
        setSaveProgress(i + 1);
        const ov = overridesPerSlide[i];
        const variant = ov.logoVariant ?? defaultLogoVariant;
        const logo = variant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);
        const tmpl = applyEditorOverrides(withLogoOverride(withFooter, logo), "4:5", ov);
        const vals = slideValues(i);

        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRenderInput(tmpl, vals, "4:5")),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? `Gagal merender slide ${i + 1}.`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `keposting-carousel-slide-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const { photo: _photo, ...textValues } = vals;
        const saved = await saveManualContent({
          pngBlob: blob,
          backgroundSrc: backgrounds[i],
          layoutState: {
            templateId: "carousel",
            ratio: "4:5",
            values: textValues,
            overrides: ov,
            logoVariant: variant,
            overlayColor,
            overlayOpacity,
            slideIndex: i,
          },
          onImageText: vals.title || `Carousel slide ${i + 1}`,
          caption: i === 0 ? caption : "",
          ratio: "4:5",
          jenis: "produk",
          existingId: newSavedIds[i],
        });
        if (saved.ok) newSavedIds[i] = saved.id;
        else throw new Error(`Slide ${i + 1} terunduh, tapi gagal simpan ke Riwayat: ${saved.error}`);
      }
      setSavedIds(newSavedIds);
      setSaveStatus("success");
    } catch (e) {
      setSavedIds(newSavedIds);
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-navy/60 hover:text-navy">
          &larr; Model
        </button>
        <h1 className="text-xl font-bold text-navy">Carousel (4 Slide)</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
        {/* KIRI: input */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Pilih 3 Foto (Slide 1-3)</h3>
              <span className="text-xs text-navy/50">{selectedIds.length}/{USER_PHOTO_COUNT} dipilih</span>
            </div>
            <p className="text-xs text-navy/50">
              Urutan klik = urutan slide. Slide 4 (penutup) gambarnya dibuatkan AI otomatis biar seragam.
            </p>
            {images.length === 0 ? (
              <p className="text-xs text-navy/40">
                Belum ada gambar. Upload foto dulu di Dashboard &rarr; Galeri.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => {
                  const order = selectedIds.indexOf(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggleImage(img.id)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        order >= 0 ? "border-primary" : "border-line hover:border-primary/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.publicUrl} alt={img.description} className="h-full w-full object-cover" />
                      {order >= 0 ? (
                        <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                          {order + 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">Overlay Warna</h3>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setOverlayColor(c.hex)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    overlayColor.toLowerCase() === c.hex.toLowerCase() ? "border-primary scale-110" : "border-line"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <label className="flex h-9 items-center gap-2 rounded-full border border-line px-2 text-xs text-navy/60">
                <input
                  type="color"
                  value={overlayColor}
                  onChange={(e) => setOverlayColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                />
                Warna lain
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="flex items-center justify-between text-xs font-medium text-navy/60">
                <span>Opacity overlay</span>
                <span>{overlayOpacity}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="accent-[var(--color-primary,#0fb6a6)]"
              />
            </label>
            <p className="text-xs text-navy/40">Overlay menutup foto supaya teks terbaca — berlaku seragam di 4 slide.</p>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="cta"
              onClick={handleGenerate}
              disabled={genStatus === "loading" || selectedIds.length !== USER_PHOTO_COUNT || !businessProfile}
            >
              {genStatus === "loading" ? "AI sedang bekerja..." : `Generate Carousel (${CAROUSEL_TOKEN_COST} token)`}
            </Button>
            {genStatus === "loading" ? (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                Menulis 4 slide + membuat gambar penutup... (1-2 menit)
              </span>
            ) : null}
            {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
            {!businessProfile ? (
              <p className="text-xs text-navy/50">Lengkapi profil bisnis dulu di onboarding untuk memakai fitur ini.</p>
            ) : null}
          </div>

          {ready ? (
            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-navy">Caption Instagram (1 untuk seluruh carousel)</h3>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="resize-none rounded-2xl border border-line px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
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
          ) : null}

          {ready ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="cta" onClick={handleSimpanSemua} disabled={saveStatus === "loading"}>
                {saveStatus === "loading" ? `Merender slide ${saveProgress}/4...` : "Simpan 4 PNG"}
              </Button>
              {saveStatus === "success" ? (
                <span className="text-sm font-medium text-primary">4 PNG terunduh &amp; masuk Riwayat</span>
              ) : null}
              {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
            </div>
          ) : null}
        </div>

        {/* KANAN: preview + tab slide */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start">
          {!ready ? (
            <div
              className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-navy/[0.02] p-8"
              style={{ minHeight: 300 }}
            >
              <p className="text-center text-xs text-navy/40">
                Pilih 3 foto lalu Generate — hasil 4 slide muncul di sini.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlide(i)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      activeSlide === i ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"
                    }`}
                  >
                    Slide {i + 1}
                    {savedIds[i] ? " ✓" : ""}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-navy/60">Preview slide {activeSlide + 1} — geser &amp; edit langsung</p>
              <CanvasEditor
                key={`carousel-${activeSlide}-${backgrounds[activeSlide]?.length ?? 0}`}
                layout={applyEditorOverrides(withLogoOverride(withFooter, activeLogo), "4:5", activeOverrides).layouts["4:5"]}
                values={slideValues(activeSlide)}
                overrides={activeOverrides}
                onOverridesChange={(ov) =>
                  setOverridesPerSlide((all) => all.map((o, idx) => (idx === activeSlide ? ov : o)))
                }
                onTextChange={(slotId, val) =>
                  setValuesPerSlide((all) =>
                    all.map((v, idx) => (idx === activeSlide ? { ...v, [slotId]: val } : v)),
                  )
                }
                footerPreviewText={footerOverride?.socials?.[0]?.value}
                socials={footerOverride?.socials ?? []}
                businessName={businessProfile?.business.name}
                logoUrl={activeLogo?.url ?? null}
                logoVariant={activeLogoVariant}
                canToggleLogo={!!(logoDark && logoLight)}
                onLogoVariantChange={(v) =>
                  setOverridesPerSlide((all) =>
                    all.map((o, idx) => (idx === activeSlide ? { ...o, logoVariant: v } : o)),
                  )
                }
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
