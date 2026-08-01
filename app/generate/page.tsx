"use client";

import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { saveManualContent } from "@/lib/content/saveContent";
import { HelpTip } from "@/components/ui/HelpTip";
import { createProdukLatarTemplate } from "@/lib/templates/model-produk-latar";
import { StandarContent } from "@/components/generate/StandarContent";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; publicUrl: string };

const RATIO_OPTIONS: { value: AspectRatio; label: string; w: number; h: number }[] = [
  { value: "4:5", label: "Feed (4:5)", w: 1080, h: 1350 },
  { value: "1:1", label: "Kotak (1:1)", w: 1080, h: 1080 },
  { value: "9:16", label: "Story (9:16)", w: 1080, h: 1920 },
];

const BG_PRESETS = [
  { label: "Orange", value: "#F97316" },
  { label: "Merah", value: "#EF4444" },
  { label: "Biru Tua", value: "#1D4ED8" },
  { label: "Hijau", value: "#16A34A" },
  { label: "Ungu", value: "#7C3AED" },
  { label: "Kuning", value: "#CA8A04" },
  { label: "Coklat", value: "#78350F" },
  { label: "Teal", value: "#0F766E" },
  { label: "Hitam", value: "#111111" },
  { label: "Abu", value: "#374151" },
];

const CONTENT_MODELS = [
  { id: "produk-latar", label: "Produk + Latar Warna", desc: "AI potong background produk, lalu gabungkan dengan latar warna pilihanmu.", emoji: "🟧", available: true },
  { id: "standar", label: "Konten Standar", desc: "Isi judul & deskripsi, pilih gambar (bisa diolah AI), lalu atur di editor.", emoji: "📝", available: true },
  { id: "gabungan-2", label: "Gabungan 2 Gambar", desc: "Foto produk + foto latar dikombinasikan.", emoji: "🖼️", available: false },
  { id: "teks-saja", label: "Teks Saja", desc: "Background warna solid dengan teks besar.", emoji: "✍️", available: false },
  { id: "perbandingan", label: "Perbandingan 2 Produk", desc: "Split kiri-kanan, bandingkan dua produk.", emoji: "⚖️", available: false },
  { id: "kolase", label: "Kolase 2–4 Produk", desc: "Grid foto beberapa produk sekaligus.", emoji: "🔲", available: false },
  { id: "foto-blur", label: "Foto + Latar Buram", desc: "Foto produk/orang di depan dengan latar blur.", emoji: "🌫️", available: false },
];

/** Load gambar dari URL jadi HTMLImageElement via blob (bebas CORS) */
function loadImgFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    fetch(url, { cache: "no-store" })
      .then(r => r.blob())
      .then(b => {
        const objUrl = URL.createObjectURL(b);
        const el = new window.Image();
        el.onload = () => { resolve(el); setTimeout(() => URL.revokeObjectURL(objUrl), 5000); };
        el.onerror = reject;
        el.src = objUrl;
      })
      .catch(reject);
  });
}

/** Load gambar dari data URI jadi HTMLImageElement */
function loadImgFromDataUri(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUri;
  });
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Gabungkan 2 layer di canvas:
 * Layer 1 (bawah): foto asli → blur + overlay warna + vignette
 * Layer 2 (atas): produk PNG transparan (background sudah dihapus AI) → tajam
 */
async function buildComposite(
  originalUrl: string,      // foto asli untuk latar
  productDataUri: string,   // produk PNG transparan dari Gemini
  bgColor: string,
  overlayOpacity: number,
  blurRadius: number,
  outW: number,
  outH: number,
): Promise<string> {
  const [bgImg, productImg] = await Promise.all([
    loadImgFromUrl(originalUrl),
    loadImgFromDataUri(productDataUri),
  ]);

  // === Layer 1: Latar (foto asli + blur + overlay + vignette) ===
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = outW; bgCanvas.height = outH;
  const bgCtx = bgCanvas.getContext("2d")!;

  // Gambar foto asli dengan blur, pad supaya tepi tidak potongan
  const pad = blurRadius * 3;
  const sx = (outW + pad * 2) / bgImg.naturalWidth;
  const sy = (outH + pad * 2) / bgImg.naturalHeight;
  const s = Math.max(sx, sy);
  bgCtx.filter = `blur(${blurRadius}px)`;
  bgCtx.drawImage(bgImg,
    -pad + (outW + pad * 2 - bgImg.naturalWidth * s) / 2,
    -pad + (outH + pad * 2 - bgImg.naturalHeight * s) / 2,
    bgImg.naturalWidth * s, bgImg.naturalHeight * s,
  );
  bgCtx.filter = "none";

  // Overlay warna
  const [r, g, b] = hexRgb(bgColor);
  bgCtx.globalAlpha = overlayOpacity;
  bgCtx.fillStyle = `rgb(${r},${g},${b})`;
  bgCtx.fillRect(0, 0, outW, outH);
  bgCtx.globalAlpha = 1;

  // Vignette radial gelap di pinggir
  const vig = bgCtx.createRadialGradient(
    outW / 2, outH / 2, Math.min(outW, outH) * 0.2,
    outW / 2, outH / 2, Math.max(outW, outH) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  bgCtx.fillStyle = vig;
  bgCtx.fillRect(0, 0, outW, outH);

  // === Layer 2: Produk tajam di atas ===
  const out = document.createElement("canvas");
  out.width = outW; out.height = outH;
  const ctx = out.getContext("2d")!;

  // Tempel latar
  ctx.drawImage(bgCanvas, 0, 0);

  // Produk PNG (tajam) digambar dengan transform COVER yang SAMA seperti latar,
  // memakai dimensinya sendiri — jadi produk tetap di posisi & ukuran aslinya,
  // menyatu dengan latar blur (bukan mengambang di ukuran berbeda).
  const sPr = Math.max((outW + pad * 2) / productImg.naturalWidth, (outH + pad * 2) / productImg.naturalHeight);
  const pw = productImg.naturalWidth * sPr;
  const ph = productImg.naturalHeight * sPr;
  const px = -pad + (outW + pad * 2 - pw) / 2;
  const py = -pad + (outH + pad * 2 - ph) / 2;

  ctx.drawImage(productImg, px, py, pw, ph);

  return out.toDataURL("image/jpeg", 0.93);
}

export default function GeneratePage() {
  const [showModelPicker, setShowModelPicker] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#F97316");
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [blurRadius, setBlurRadius] = useState(20);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PickableImage | null>(null);
  const [overrides, setOverrides] = useState<EditorOverrides>({ slots: {} });
  const [values, setValues] = useState<Record<string, string>>({});
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  // State proses AI (hapus background)
  const [removeBgStatus, setRemoveBgStatus] = useState<Status>("idle");
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);
  const [productDataUri, setProductDataUri] = useState<string | null>(null);

  // State composite (gabungkan latar + produk)
  const [compositeDataUri, setCompositeDataUri] = useState<string | null>(null);
  const [compositeStatus, setCompositeStatus] = useState<Status>("idle");

  const [renderStatus, setRenderStatus] = useState<Status>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("idle");
  const [copiedCaption, setCopiedCaption] = useState(false);

  const compositeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/business-profile").then(r => r.json()).then(d => setBusinessProfile(d.profile ?? null)).catch(() => {});
    fetch("/api/images").then(r => r.json()).then(d => setImages(d.images ?? [])).catch(() => {});
  }, []);

  // Setiap kali warna/blur/opacity/ratio berubah, rebuild composite (kalau sudah ada produk)
  useEffect(() => {
    if (!selectedImage || !productDataUri) return;
    if (compositeTimer.current) clearTimeout(compositeTimer.current);
    setCompositeStatus("loading");
    compositeTimer.current = setTimeout(async () => {
      const ratioOpt = RATIO_OPTIONS.find(o => o.value === ratio) ?? RATIO_OPTIONS[0];
      try {
        const uri = await buildComposite(
          selectedImage.publicUrl, productDataUri,
          bgColor, overlayOpacity, blurRadius,
          ratioOpt.w, ratioOpt.h,
        );
        setCompositeDataUri(uri);
        setCompositeStatus("success");
      } catch {
        setCompositeStatus("error");
      }
    }, 300);
    return () => { if (compositeTimer.current) clearTimeout(compositeTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgColor, overlayOpacity, blurRadius, ratio, productDataUri]);

  // Sync composite ke values.photo
  useEffect(() => {
    if (compositeDataUri) {
      setValues(v => ({ ...v, photo: compositeDataUri }));
    }
  }, [compositeDataUri]);

  /** Langkah 1: Pilih foto → langsung hapus background via AI */
  async function handleSelectImage(img: PickableImage) {
    setSelectedImage(img);
    setSavedId(null);
    setProductDataUri(null);
    setCompositeDataUri(null);
    setRemoveBgStatus("loading");
    setRemoveBgError(null);

    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: img.publicUrl }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal hapus background.");
      setProductDataUri(d.dataUri);
      setRemoveBgStatus("success");
    } catch (e) {
      setRemoveBgStatus("error");
      setRemoveBgError(e instanceof Error ? e.message : "Gagal hapus background.");
      // Fallback: pakai foto asli kalau AI gagal
      setProductDataUri(null);
    }
  }

  const footerOverride = businessProfile?.socials?.entries?.length
    ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
    : null;

  const baseTemplate = createProdukLatarTemplate(bgColor);
  const withFooter = footerOverride?.socials?.length
    ? withFooterOverride(baseTemplate, footerOverride.businessName, footerOverride.socials)
    : baseTemplate;
  // Logo: versi TERANG jadi default saat konten muncul (permintaan user);
  // fallback ke versi gelap kalau terang belum diupload. User bisa ganti versi
  // lewat editor (dobel-klik logo / tombol Terang-Gelap) → tersimpan di
  // overrides.logoVariant sehingga PNG hasil render ikut versi yang dipilih.
  const logoDark = businessProfile?.logo ?? null;
  const logoLight = businessProfile?.logoLight ?? null;
  const defaultLogoVariant: "dark" | "light" = logoLight ? "light" : "dark";
  const activeLogoVariant = overrides.logoVariant ?? defaultLogoVariant;
  const activeLogo = activeLogoVariant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);
  const template = withLogoOverride(withFooter, activeLogo);
  const editTemplate = applyEditorOverrides(template, ratio, overrides);
  const layout = editTemplate.layouts[ratio];

  async function handleSimpanPng() {
    setRenderStatus("loading"); setRenderError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, values, ratio)),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? "Gagal merender."); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `kevo-produk-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      // Simpan ke Riwayat (hanya saat Simpan) — update baris sama kalau sudah pernah.
      const { photo: _photo, ...textValues } = values;
      const saved = await saveManualContent({
        pngBlob: blob,
        backgroundSrc: compositeDataUri ?? _photo ?? "",
        layoutState: { templateId: "produk-latar", ratio, values: textValues, overrides, logoVariant: activeLogoVariant, bgColor },
        onImageText: values.title ?? "",
        caption,
        ratio,
        jenis: "produk",
        existingId: savedId,
      });
      if (saved.ok) setSavedId(saved.id);
      else setRenderError(`PNG terunduh, tapi gagal simpan ke Riwayat: ${saved.error}`);
      setRenderStatus("success");
    } catch (e) { setRenderStatus("error"); setRenderError(e instanceof Error ? e.message : "Gagal."); }
  }

  async function handleGenerateCaption() {
    if (!businessProfile) return;
    setCaptionStatus("loading");
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: "Produk + Latar Warna",
          values: { Judul: values.title ?? "", Deskripsi: values.subtitle ?? "" },
          businessProfile,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal.");
      setCaption(d.caption ?? ""); setCaptionStatus("success");
    } catch { setCaptionStatus("error"); }
  }

  // === STATUS KESELURUHAN ===
  const isProcessing = removeBgStatus === "loading" || compositeStatus === "loading";
  const isReady = compositeDataUri !== null;

  if (showModelPicker) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">Pilih Model Konten</h1>
              <HelpTip
                title="Panduan & saran"
                align="left"
                text={
                  <span className="flex flex-col gap-1.5">
                    <span><b>Produk + Latar Warna</b> — untuk 1 produk jelas dengan latar sederhana (mis. botol di meja polos). AI memotong produk lalu menaruhnya di latar warna pilihanmu.</span>
                    <span><b>Konten Standar</b> — paling fleksibel: isi judul & deskripsi, pilih gambar (bisa diolah AI atau dipakai apa adanya). Cocok untuk hampir semua foto.</span>
                    <span><b>Otomatis</b> — AI membuat gambar + caption otomatis dari data bisnismu.</span>
                    <span className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-800">💡 <b>Saran:</b> kalau fotomu ramai / banyak objek / produk kecil, jangan pakai "Produk + Latar Warna" — hasil potongnya kurang rapi. Pakai <b>Konten Standar</b> (Generate AI) atau opsi "Pakai Gambar Asli".</span>
                  </span>
                }
              />
            </div>
            <p className="mt-1 text-navy/60">Pilih tampilan yang ingin kamu buat.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTENT_MODELS.map((model) => (
              <button key={model.id} type="button" disabled={!model.available}
                onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition ${
                  model.available ? "border-line hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98]"
                  : "border-line bg-navy/[0.02] opacity-50 cursor-not-allowed"}`}>
                <span className="text-3xl">{model.emoji}</span>
                <div>
                  <p className="font-semibold text-navy">{model.label}</p>
                  <p className="mt-0.5 text-xs text-navy/60">{model.desc}</p>
                </div>
                <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  model.available ? "bg-primary/15 text-primary" : "bg-navy/10 text-navy/50"
                }`}>{model.available ? "Tersedia" : "Segera hadir"}</span>
              </button>
            ))}
          </div>
        </main>
      </>
    );
  }

  if (selectedModel === "standar") {
    return (
      <>
        <Header />
        <StandarContent
          businessProfile={businessProfile}
          onBack={() => { setShowModelPicker(true); setSelectedModel(null); }}
        />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setShowModelPicker(true); setSelectedModel(null); }}
            className="text-sm font-medium text-navy/60 hover:text-navy">← Ganti Model</button>
          <span className="text-navy/30">|</span>
          <h1 className="text-xl font-bold text-navy">Produk + Latar Warna</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">

            {/* Ukuran */}
            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-navy">Ukuran</h3>
              <div className="flex flex-wrap gap-2">
                {RATIO_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setRatio(opt.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      ratio === opt.value ? "border-primary bg-primary/10 text-primary" : "border-line text-navy hover:bg-navy/5"
                    }`}>{opt.label}</button>
                ))}
              </div>
            </Card>

            {/* Foto Produk — pilih dulu, AI langsung proses */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Foto Produk</h3>
                {removeBgStatus === "loading" && (
                  <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                    AI memotong background... (~30 detik)
                  </span>
                )}
                {removeBgStatus === "success" && (
                  <span className="text-xs font-medium text-primary">✓ Background berhasil dipotong</span>
                )}
                {removeBgStatus === "error" && (
                  <span className="text-xs text-red-500">Gagal potong background</span>
                )}
              </div>
              <p className="text-xs text-navy/50">
                Pilih foto → AI otomatis memotong background produk (~30 detik), lalu efek latar diterapkan.
              </p>
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((img) => (
                    <button key={img.id} type="button"
                      onClick={() => handleSelectImage(img)}
                      disabled={removeBgStatus === "loading"}
                      className={`group relative overflow-hidden rounded-xl border-2 transition ${
                        selectedImage?.id === img.id ? "border-primary" : "border-line hover:border-primary/40"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}>
                      <img src={img.publicUrl} alt={img.description} className="aspect-square w-full object-cover" />
                      {selectedImage?.id === img.id && removeBgStatus === "success" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <span className="text-white text-lg font-bold">✓</span>
                        </div>
                      ) : null}
                      {selectedImage?.id === img.id && removeBgStatus === "loading" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white text-xs">Memproses...</span>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy/60">Belum ada gambar. Upload dulu di Database Gambar.</p>
              )}
              {removeBgError ? <p className="text-xs text-red-600">{removeBgError}</p> : null}
            </Card>

            {/* Warna & Efek — hanya aktif kalau produk sudah dipotong */}
            <Card className={`flex flex-col gap-4 transition ${!productDataUri ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Warna & Efek Latar</h3>
                {compositeStatus === "loading" ? (
                  <span className="text-xs text-primary animate-pulse">⏳ Memperbarui...</span>
                ) : compositeStatus === "success" ? (
                  <span className="text-xs text-primary">✓ Diperbarui</span>
                ) : null}
              </div>
              {!productDataUri && (
                <p className="text-xs text-navy/40">Pilih foto produk dulu untuk mengaktifkan pengaturan warna.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {BG_PRESETS.map((c) => (
                  <button key={c.value} type="button" title={c.label} onClick={() => setBgColor(c.value)}
                    className={`h-9 w-9 rounded-xl border-2 transition hover:scale-110 ${bgColor === c.value ? "border-primary scale-110" : "border-transparent"}`}
                    style={{ background: c.value }} />
                ))}
                <label className="flex items-center gap-1.5 text-xs text-navy/60">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="h-9 w-9 rounded-xl border border-line cursor-pointer" />
                  Custom
                </label>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl bg-navy/[0.03] p-4">
                <p className="text-xs font-medium text-navy/60">Sesuaikan efek latar:</p>
                <label className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-navy/60">Overlay warna</span>
                  <input type="range" min={5} max={80} step={5} value={Math.round(overlayOpacity * 100)}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)} className="flex-1" />
                  <span className="tabular-nums w-8 text-navy/60">{Math.round(overlayOpacity * 100)}%</span>
                </label>
                <label className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-navy/60">Blur latar</span>
                  <input type="range" min={0} max={40} step={2} value={blurRadius}
                    onChange={(e) => setBlurRadius(Number(e.target.value))} className="flex-1" />
                  <span className="tabular-nums w-8 text-navy/60">{blurRadius}px</span>
                </label>
              </div>
            </Card>

            {/* Teks */}
            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-navy">Teks</h3>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-navy/70">Judul</span>
                <input type="text" value={values.title ?? ""}
                  onChange={(e) => setValues(v => ({ ...v, title: e.target.value }))}
                  placeholder="Nama produk / headline"
                  className="rounded-2xl border border-line px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-navy/70">Tagline / Deskripsi</span>
                <textarea value={values.subtitle ?? ""} rows={2}
                  onChange={(e) => setValues(v => ({ ...v, subtitle: e.target.value }))}
                  placeholder="Tagline atau harga"
                  className="rounded-2xl border border-line px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 resize-none" />
              </label>
            </Card>

            {/* Caption */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Caption Instagram</h3>
                <Button type="button" variant="secondary" onClick={handleGenerateCaption}
                  disabled={captionStatus === "loading"} className="text-xs px-3 py-1.5">
                  {captionStatus === "loading" ? "Membuat..." : "✨ Generate"}
                </Button>
              </div>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
                placeholder="Caption di sini, atau generate otomatis"
                className="rounded-2xl border border-line px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 resize-none" />
              {caption ? (
                <button type="button" onClick={async () => {
                  await navigator.clipboard.writeText(caption).catch(() => {});
                  setCopiedCaption(true); setTimeout(() => setCopiedCaption(false), 2000);
                }} className="self-start text-xs font-medium text-primary hover:underline">
                  {copiedCaption ? "Tersalin! ✓" : "Salin Caption"}
                </button>
              ) : null}
            </Card>

            {/* Simpan */}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="cta" onClick={handleSimpanPng}
                disabled={renderStatus === "loading" || !isReady || isProcessing}>
                {renderStatus === "loading" ? "Merender..." : "Simpan PNG"}
              </Button>
              {renderStatus === "success" ? <span className="text-sm font-medium text-primary">PNG Terunduh ✓</span> : null}
              {renderError ? <p className="text-sm text-red-600">{renderError}</p> : null}
              {!isReady && !isProcessing ? <p className="text-xs text-navy/50">Pilih foto produk dulu.</p> : null}
              {isProcessing ? <p className="text-xs text-navy/50">Menunggu proses selesai...</p> : null}
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-medium text-navy/60">Preview — geser & edit langsung</p>

            {/* Status step */}
            <div className="rounded-2xl border border-line bg-white p-3 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${removeBgStatus === "success" ? "bg-primary" : removeBgStatus === "loading" ? "bg-amber-400 animate-pulse" : "bg-slate-300"}`} />
                <span className={removeBgStatus === "success" ? "text-primary font-medium" : "text-navy/50"}>
                  {removeBgStatus === "loading" ? "AI memotong background produk..." : removeBgStatus === "success" ? "Background berhasil dipotong" : "Langkah 1: Pilih foto produk"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${compositeStatus === "success" ? "bg-primary" : compositeStatus === "loading" ? "bg-amber-400 animate-pulse" : "bg-slate-300"}`} />
                <span className={compositeStatus === "success" ? "text-primary font-medium" : "text-navy/50"}>
                  {compositeStatus === "loading" ? "Menggabungkan latar + produk..." : compositeStatus === "success" ? "Preview siap diedit" : "Langkah 2: Pilih warna & efek latar"}
                </span>
              </div>
            </div>

            {!compositeDataUri ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-navy/[0.02] gap-3 p-8"
                style={{ minHeight: 300 }}>
                {removeBgStatus === "loading" ? (
                  <>
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs text-navy/60 text-center">AI sedang memotong background produk...<br/>Mohon tunggu ~30 detik</p>
                  </>
                ) : (
                  <p className="text-xs text-navy/40 text-center">Pilih foto produk untuk memulai</p>
                )}
              </div>
            ) : (
              <CanvasEditor
                key={compositeDataUri.slice(-20)}
                layout={layout}
                values={{ ...values, photo: compositeDataUri }}
                overrides={overrides}
                onOverridesChange={setOverrides}
                onTextChange={(slotId, val) => setValues(v => ({ ...v, [slotId]: val }))}
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
    </>
  );
}
