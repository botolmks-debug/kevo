"use client";

import { getLang } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BusyToast } from "@/components/ui/BusyToast";
import { Button } from "@/components/ui/Button";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { saveManualContent } from "@/lib/content/saveContent";
import { createStandarTemplate } from "@/lib/templates/model-standar";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; usage: string; publicUrl: string; sizeHint?: string | null };

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "4:5", label: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)" },
  { value: "9:16", label: "Story (9:16)" },
];

export function StandarContent({
  businessProfile,
  onBack,
}: {
  businessProfile: BusinessProfile | null;
  onBack: () => void;
}) {
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PickableImage | null>(null);
  // "values" = SATU-SATUNYA sumber kebenaran untuk teks (title/desc-N) —
  // dipakai baik oleh input panel kiri MAUPUN edit langsung di kanvas
  // (dobel-klik), jadi keduanya selalu sinkron, tidak ada yang "ketinggalan".
  const [descCount, setDescCount] = useState(1);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [overrides, setOverrides] = useState<EditorOverrides>({ slots: {} });
  const [values, setValues] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null); // dataUri (AI) atau URL (asli)
  const [genStatus, setGenStatus] = useState<Status>("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<Status>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Auto-caption (dari data onboarding + judul/deskripsi)
  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("idle");
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    fetch("/api/images").then((r) => r.json()).then((d) => setImages(d.images ?? [])).catch(() => {});
  }, []);

  const judul = values.title ?? "";
  const descList = Array.from({ length: descCount }, (_, i) => values[`desc-${i}`] ?? "");
  const isAiImage = selectedImage?.usage === "olah_ai";
  const canUseOriginal = !!selectedImage;
  const canGenerateAI =
    !!selectedImage && isAiImage && judul.trim().length > 0 && descList.some((d) => d.trim().length > 0);

  function setTitle(val: string) {
    setValues((v) => ({ ...v, title: val }));
  }
  function setDescAt(i: number, val: string) {
    setValues((v) => ({ ...v, [`desc-${i}`]: val }));
  }
  function addDescription() {
    setDescCount((c) => c + 1);
  }
  // Hapus 1 blok deskripsi & geser sisanya supaya index (desc-0..desc-N) tetap rapat.
  function removeDescription(i: number) {
    if (descCount <= 1) return;
    setValues((v) => {
      const nv = { ...v };
      for (let k = i; k < descCount - 1; k++) {
        nv[`desc-${k}`] = v[`desc-${k + 1}`] ?? "";
      }
      delete nv[`desc-${descCount - 1}`];
      return nv;
    });
    setDescCount((c) => c - 1);
  }

  // Pakai gambar asli tanpa AI - disesuaikan (cover) ke ukuran postingan.
  function handleUseOriginal() {
    if (!selectedImage) return;
    setGenError(null);
    setSavedId(null);
    setPhoto(selectedImage.publicUrl);
    setValues((v) => ({ ...v, photo: selectedImage.publicUrl }));
    setGenStatus("success");
  }

  // Olah gambar dengan AI berdasarkan judul + deskripsi.
  async function handleGenerateAI() {
    if (!canGenerateAI || !selectedImage) return;
    setGenStatus("loading");
    setGenError(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/generate-standar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedImage.publicUrl, judul, descriptions: descList, ratio, sizeHint: selectedImage.sizeHint ?? "" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? `Gagal generate gambar (status ${res.status}).`);
      setPhoto(d.dataUri);
      setValues((v) => ({ ...v, photo: d.dataUri }));
      setGenStatus("success");
    } catch (e) {
      setGenStatus("error");
      setGenError(e instanceof Error ? e.message : "Gagal generate.");
    }
  }

  async function handleGenerateCaption() {
    if (!businessProfile) return;
    setCaptionStatus("loading");
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: "Konten Standar",
          values: { Judul: judul, Deskripsi: descList.filter((d) => d.trim()).join(" ") },
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

  const baseTemplate = createStandarTemplate(descCount, values.title ?? "", descList);
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

  async function urlToDataUri(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length < 4) return null;
      // Deteksi MIME dari MAGIC BYTES, bukan header Content-Type — storage kadang
      // melayani JPEG dengan label image/png. Label salah bikin mesin render
      // (Satori) gagal decode → gambar hitam. Ini akar bug "simpan hitam".
      let mime = "image/jpeg";
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) mime = "image/png";
      else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = "image/jpeg";
      else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) mime = "image/gif";
      else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) mime = "image/webp";
      const typed = new Blob([bytes], { type: mime });
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(typed);
      });
    } catch {
      return null;
    }
  }

  async function handleSimpanPng() {
    // photo bisa berupa URL (opsi "Pakai Gambar Asli") — ubah ke data URI dulu
    // supaya server render meng-embed-nya, bukan mem-fetch URL storage yang bisa
    // gagal (auth/RLS) dan menghasilkan gambar hitam tanpa foto.
    let renderValues = values;
    const photo = values.photo;
    if (!photo) {
      setRenderStatus("error");
      setRenderError("Pilih gambar dulu sebelum menyimpan.");
      return;
    }
    if (!photo.startsWith("data:")) {
      const dataUri = await urlToDataUri(photo);
      if (!dataUri) {
        setRenderStatus("error");
        setRenderError("Gambar gagal dimuat. Coba pilih ulang gambarnya.");
        return;
      }
      renderValues = { ...values, photo: dataUri };
    }
    setRenderStatus("loading");
    setRenderError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, renderValues, ratio)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Gagal merender.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kevo-standar-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Simpan ke Riwayat (hanya saat Simpan) — update baris sama kalau sudah pernah.
      const { photo: _photo, ...textValues } = values;
      const saved = await saveManualContent({
        pngBlob: blob,
        backgroundSrc: renderValues.photo ?? "",
        layoutState: { templateId: "standar", ratio, values: textValues, overrides, logoVariant: activeLogoVariant, descCount },
        onImageText: judul,
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
        <h1 className="text-xl font-bold text-navy">Konten Standar</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
        {/* KIRI: input */}
        <div className="flex flex-col gap-4">
          {/* Teks */}
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">Teks Konten</h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-navy/60">Judul</span>
              <input
                value={judul}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul konten"
                className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </label>
            {descList.map((d, i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="flex items-center justify-between text-xs font-medium text-navy/60">
                  <span>Deskripsi {i + 1}</span>
                  {descCount > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeDescription(i)}
                      className="text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  ) : null}
                </span>
                <textarea
                  value={d}
                  onChange={(e) => setDescAt(i, e.target.value)}
                  rows={2}
                  placeholder={`Deskripsi ${i + 1}`}
                  className="resize-none rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={addDescription}
              className="self-start text-xs font-medium text-primary hover:underline"
            >
              + Tambah Deskripsi
            </button>
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

          {/* Pilih gambar */}
          <Card className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-navy">Pilih Gambar</h3>
            {images.length === 0 ? (
              <p className="text-xs text-navy/50">Belum ada gambar. Upload dulu di halaman Gambar.</p>
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
                    {img.usage === "olah_ai" ? (
                      <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1 text-[10px] font-medium text-white">
                        AI
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            {selectedImage ? (
              <p className="text-xs text-navy/60">
                {isAiImage
                  ? "Gambar ini bisa diolah AI, atau dipakai apa adanya."
                  : "Gambar ini dipakai apa adanya (tanpa AI)."}
              </p>
            ) : null}
          </Card>

          {/* Aksi: Buat gambar */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleUseOriginal} disabled={!canUseOriginal}>
                Pakai Gambar Asli
              </Button>
              {isAiImage ? (
                <Button type="button" variant="cta" onClick={handleGenerateAI} disabled={!canGenerateAI || genStatus === "loading"}>
                  {genStatus === "loading" ? "Memproses..." : "Generate dengan AI"}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-navy/50">Setiap klik &quot;Generate dengan AI&quot; memakai 1 token (Pakai Gambar Asli gratis).</p>
            {!selectedImage ? <p className="text-xs text-navy/50">Pilih gambar dulu.</p> : null}
            {isAiImage && !canGenerateAI && selectedImage ? (
              <p className="text-xs text-navy/50">Untuk olah AI: isi judul & minimal 1 deskripsi.</p>
            ) : null}
            {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
          </div>

          {/* Auto-caption */}
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
              {genStatus === "loading" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-center text-xs text-navy/60">
                    AI sedang mengolah gambar...
                    <br />
                    Mohon tunggu ~30-60 detik
                  </p>
                </div>
              ) : (
                <p className="text-center text-xs text-navy/40">
                  Pilih gambar, lalu &quot;Pakai Gambar Asli&quot; atau &quot;Generate dengan AI&quot;.
                </p>
              )}
            </div>
          ) : (
            <CanvasEditor
              key={`${photo.slice(-20)}-${descCount}`}
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
      <BusyToast active={genStatus === "loading"} />
    </main>
  );
}
