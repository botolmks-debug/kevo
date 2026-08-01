"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import type { ImageUsage } from "@/lib/images/categories";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import type { GeneratedContentJenis } from "@/lib/supabase/generatedContent";
import { polosTemplate } from "@/lib/templates/polos";
import { interaksiTemplate } from "@/lib/templates/interaksi";
import type { AspectRatio } from "@/lib/templates/types";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import { shareContent } from "@/lib/share";

type PickableImage = {
  id: string;
  description: string;
  category: string;
  publicUrl: string;
  usage: ImageUsage;
};

type GeneratedItem = {
  id: string;
  jenis: GeneratedContentJenis;
  imageUrl: string;
  backgroundDataUri?: string;
  onImageText: string;
  caption: string;
  ratio: AspectRatio;
  status: string;
  createdAt: string;
};

type Status = "idle" | "loading" | "error" | "success";

const JENIS_OPTIONS: { value: GeneratedContentJenis; label: string; description: string }[] = [
  { value: "produk", label: "Produk", description: "Pakai foto produk yang sudah diupload, AI ubah latarnya." },
  { value: "general", label: "General", description: "AI generate gambar & isi konten dari nol." },
  { value: "interaksi", label: "Interaksi", description: "AI tentukan sendiri isi konten (kuis/quote/tips)." },
];

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "4:5", label: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)" },
  { value: "9:16", label: "Story (9:16)" },
];

const JENIS_LABEL: Record<GeneratedContentJenis, string> = {
  produk: "Produk",
  general: "General",
  interaksi: "Interaksi",
};

export function AutoGenerate() {
  const [jenis, setJenis] = useState<GeneratedContentJenis>("produk");
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [generateStatus, setGenerateStatus] = useState<Status>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedItem | null>(null);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editorOverrides, setEditorOverrides] = useState<EditorOverrides>({ slots: {} });
  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadHistory() {
    setHistoryError(null);
    try {
      const res = await fetch("/api/generate-auto");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat riwayat konten.");
      setHistory(data?.items ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Gagal memuat riwayat konten.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/images")
      .then((res) => res.json())
      .then((data: { images?: PickableImage[] }) => {
        if (cancelled) return;
        setImages((data?.images ?? []).filter((image) => image.category === "Produk" && image.usage === "olah_ai"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/business-profile")
      .then((res) => res.json())
      .then((data: { profile?: BusinessProfile | null }) => {
        if (cancelled) return;
        setBusinessProfile(data?.profile ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/generate-auto")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setHistoryError(data?.error ?? "Gagal memuat riwayat konten.");
          return;
        }
        setHistory(data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryError("Gagal memuat riwayat konten.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    if (jenis === "produk" && !selectedImageId) {
      setGenerateStatus("error");
      setGenerateError("Pilih gambar produk dulu.");
      return;
    }
    setGenerateStatus("loading");
    setGenerateError(null);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      const res = await fetch("/api/generate-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis,
          ratio,
          imageId: jenis === "produk" ? selectedImageId : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal generate konten.");

      const item: GeneratedItem = data.item;
      setResult(item);
      // Editor pakai gambar BERSIH (backgroundDataUri) supaya tidak dobel overlay.
      setEditValues({ photo: item.backgroundDataUri ?? item.imageUrl, caption: item.onImageText });
      const fontId = (data.item as any).fontId;
      const fontMatch = fontId ? FONT_OPTIONS.find((f) => f.id === fontId) : null;
      setEditorOverrides({ slots: fontMatch ? { caption: { fontFamily: fontMatch.family } } : {} });
      setGenerateStatus("success");
      await loadHistory();
    } catch (error) {
      setGenerateStatus("error");
      setGenerateError(error instanceof Error ? error.message : "Gagal generate konten.");
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  async function handleDownloadUrl(url: string, filename: string) {
    try {
      const res = await fetch(url);
      downloadBlob(await res.blob(), filename);
    } catch {}
  }

  async function handleCopyCaption(id: string, caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } catch {}
  }

  async function handleDeleteHistory(id: string) {
    if (!window.confirm("Hapus konten ini dari riwayat? Tindakan ini permanen.")) return;
    setDeletingId(id);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/generate-auto/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus konten.");
      setHistory((cur) => cur.filter((it) => it.id !== id));
      setResult((cur) => (cur && cur.id === id ? null : cur));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Gagal menghapus konten.");
    } finally {
      setDeletingId(null);
    }
  }

  const footerOverride =
    businessProfile && businessProfile.socials.entries.length > 0
      ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
      : null;
  // Logo: default versi TERANG saat konten muncul (fallback gelap). User bisa
  // ganti versi di editor (dobel-klik logo / tombol Terang-Gelap).
  const logoDark = businessProfile?.logo ?? null;
  const logoLight = businessProfile?.logoLight ?? null;
  const defaultLogoVariant: "dark" | "light" = logoLight ? "light" : "dark";
  const activeLogoVariant = editorOverrides.logoVariant ?? defaultLogoVariant;
  const activeLogo = activeLogoVariant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);
  // Editor pakai template sesuai jenis konten (sama dgn render server):
  // interaksi = ilustrasi penuh tanpa scrim; lainnya = polos (ada scrim).
  const autoBaseTemplate = result?.jenis === "interaksi" ? interaksiTemplate : polosTemplate;
  const editTemplateBase = withLogoOverride(
    footerOverride && footerOverride.socials.length > 0
      ? withFooterOverride(autoBaseTemplate, footerOverride.businessName, footerOverride.socials)
      : autoBaseTemplate,
    activeLogo,
  );
  const editTemplate = result ? applyEditorOverrides(editTemplateBase, result.ratio, editorOverrides) : null;

  async function handleShareIg() {
    if (!result || !editTemplate || sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, editValues, result.ratio)),
      });
      if (!res.ok) throw new Error("render gagal");
      const blob = await res.blob();
      const r = await shareContent(blob, result.caption, `kevo-${result.jenis}-${result.id}.png`);
      if (r === "fallback") {
        window.alert("Gambar diunduh & caption disalin. Buka Instagram → post baru → pilih gambar → tempel caption.");
      } else if (r === "error") {
        window.alert("Gagal membagikan. Coba lagi.");
      }
    } catch {
      window.alert("Gagal menyiapkan gambar untuk dibagikan.");
    } finally {
      setSharing(false);
    }
  }

  async function handleSimpanPng() {
    if (!result || !editTemplate) return;
    setSaveStatus("loading");
    setSaveError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(editTemplate, editValues, result.ratio)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal merender.");
      }
      const blob = await res.blob();

      downloadBlob(blob, `kevo-${result.jenis}-${result.id}.png`);

      // Simpan juga ke Riwayat (update baris yang sama).
      const formData = new FormData();
      formData.append("file", blob, "hasil.png");
      formData.append("onImageText", editValues.caption ?? "");
      formData.append("caption", result.caption);
      await fetch(`/api/generate-auto/${result.id}`, { method: "PATCH", body: formData });
      await loadHistory();

      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan.");
    }
  }

  const isGenerating = generateStatus === "loading";
  const isSaving = saveStatus === "loading";

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-navy">Generate Otomatis</h3>
        <p className="text-sm text-navy/60">
          AI membuat gambar, headline, dan caption. Setelah muncul, tinggal atur posisinya lalu Simpan PNG.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-navy">Jenis konten</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {JENIS_OPTIONS.map((opt) => {
            const active = jenis === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setJenis(opt.value)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-line hover:border-primary/40 hover:bg-navy/[0.02]"
                }`}
              >
                <span className={`font-semibold ${active ? "text-primary" : "text-navy"}`}>{opt.label}</span>
                <span className="text-xs text-navy/60">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {jenis === "produk" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Gambar produk</span>
          <select
            value={selectedImageId}
            onChange={(e) => setSelectedImageId(e.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-navy transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">Pilih gambar...</option>
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.description || "(tanpa deskripsi)"}
              </option>
            ))}
          </select>
          {images.length === 0 ? (
            <p className="text-xs text-navy/50">
              Belum ada gambar kategori Produk yang boleh diolah AI. Unggah dulu di Database Gambar.
            </p>
          ) : null}
        </label>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-navy">Ukuran</span>
        <div className="flex flex-wrap gap-2">
          {RATIO_OPTIONS.map((opt) => {
            const active = ratio === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRatio(opt.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-line text-navy hover:bg-navy/5"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button type="button" variant="cta" onClick={handleGenerate} disabled={isGenerating} className="w-fit">
        {isGenerating ? "Sedang membuat..." : "Generate Otomatis"}
      </Button>

      {generateError ? <p className="text-sm text-red-600">{generateError}</p> : null}

      {result && editTemplate ? (
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface/50 p-5">
          <p className="text-sm font-medium text-navy">
            Atur posisi teks, logo, dan sosmed langsung di gambar, lalu Simpan PNG.
          </p>

          <div className="mx-auto">
            <CanvasEditor
              layout={editTemplate.layouts[result.ratio]}
              values={editValues}
              overrides={editorOverrides}
              onOverridesChange={setEditorOverrides}
              onTextChange={(slotId, value) => setEditValues((v) => ({ ...v, [slotId]: value }))}
              footerPreviewText={footerOverride?.socials[0]?.value}
              socials={footerOverride?.socials ?? []}
              businessName={businessProfile?.business.name}
              logoUrl={activeLogo?.url ?? null}
              logoVariant={activeLogoVariant}
              canToggleLogo={!!(logoDark && logoLight)}
              onLogoVariantChange={(v) => setEditorOverrides((o) => ({ ...o, logoVariant: v }))}
            />
          </div>

          <Textarea label="Caption (bisa disalin)" value={result.caption} readOnly />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSimpanPng} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan PNG"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleCopyCaption("result", result.caption)}>
              {copiedId === "result" ? "Tersalin!" : "Salin Caption"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleShareIg} disabled={sharing}>
              {sharing ? "Menyiapkan..." : "Bagikan ke IG"}
            </Button>
            {saveStatus === "success" ? <span className="text-sm font-medium text-primary">Tersimpan ke Riwayat ✓</span> : null}
          </div>
          {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-navy">Riwayat</h4>
        {historyError ? <p className="text-sm text-red-600">{historyError}</p> : null}
        {history.length === 0 ? (
          <p className="text-xs text-navy/50">Belum ada konten yang digenerate.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {history.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-line p-2">
                <img
                  src={item.imageUrl}
                  alt={item.onImageText}
                  className="aspect-square w-full rounded-xl border border-line object-cover"
                />
                <span className="inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {JENIS_LABEL[item.jenis]}
                </span>
                <p className="line-clamp-2 text-xs text-navy/60" title={item.caption}>
                  {item.caption}
                </p>
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadUrl(item.imageUrl, `kevo-${item.jenis}-${item.id}.png`)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCaption(item.id, item.caption)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {copiedId === item.id ? "Tersalin!" : "Salin Caption"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
