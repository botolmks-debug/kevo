"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { LogoSettings } from "@/app/dashboard/LogoSettings";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { useLiveRender } from "@/components/editor/LivePreview";
import { applyEditorOverrides, type EditorOverrides } from "@/lib/editor/layoutOverrides";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { polosTemplate } from "@/lib/templates/polos";
import { interaksiTemplate } from "@/lib/templates/interaksi";
import { createProdukLatarTemplate } from "@/lib/templates/model-produk-latar";
import { createStandarTemplate } from "@/lib/templates/model-standar";
import { createTeksSajaTemplate } from "@/lib/templates/teks-saja";
import { createCarouselTemplate } from "@/lib/templates/carousel";
import type { ContentLayoutState } from "@/lib/content/saveContent";
import { shareContent } from "@/lib/share";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { GeneratedContentJenis } from "@/lib/supabase/generatedContent";
import type { AspectRatio } from "@/lib/templates/types";

type ContentItem = {
  id: string;
  jenis: GeneratedContentJenis;
  imageUrl: string;
  backgroundUrl?: string;
  onImageText: string;
  caption: string;
  ratio: AspectRatio;
  layoutState?: ContentLayoutState | null;
  scheduledDate?: string | null;
  createdAt: string;
};

const JENIS_LABEL: Record<GeneratedContentJenis, string> = {
  produk: "Produk", general: "General", interaksi: "Interaksi",
};

/** Tanggal hari ini (waktu lokal) sebagai YYYY-MM-DD. */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function KontenPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<EditorOverrides>({ slots: {} });
  // false = mode edit cepat (Konva, ringan, default). true = render Satori asli
  // (akurat) — HANYA saat user klik "Lihat hasil asli". Tidak dirender saat buka.
  const [previewMode, setPreviewMode] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<ContentLayoutState["templateId"]>("polos");
  const [editBgColor, setEditBgColor] = useState<string | undefined>(undefined);
  const [editDescCount, setEditDescCount] = useState<number | undefined>(undefined);
  const [scheduleStatus, setScheduleStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/generate-auto")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => { setError("Gagal memuat konten."); setLoading(false); });
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((d) => setBusinessProfile(d.profile ?? null))
      .catch(() => {});
  }, []);

  function openEdit(item: ContentItem) {
    setSelected(item);
    // Pakai gambar bersih (backgroundUrl) kalau ada, fallback ke imageUrl.
    const bgPhoto = item.backgroundUrl ?? item.imageUrl;
    const ls = item.layoutState;
    if (ls) {
      // Konten baru: buka-ulang PERSIS dari snapshot editor.
      setEditValues({ ...ls.values, photo: bgPhoto });
      setOverrides(ls.overrides ?? { slots: {} });
      setEditTemplateId(ls.templateId);
      setEditBgColor(ls.bgColor);
      setEditDescCount(ls.descCount);
    } else {
      // Konten lama (tanpa snapshot): fallback ke template polos/interaksi.
      setEditValues({ photo: bgPhoto, caption: item.onImageText });
      setOverrides({ slots: {} });
      setEditTemplateId(item.jenis === "interaksi" ? "interaksi" : "polos");
      setEditBgColor(undefined);
      setEditDescCount(undefined);
    }
    setScheduleStatus("idle");
    setSaveStatus("idle");
    setSaveError(null);
  }

  // Ubah URL gambar → data URI di sisi browser. Dipakai agar server /api/render
  // meng-embed gambar (bukan mem-fetch URL storage yang bisa gagal → hitam).
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

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function handleSimpanPng() {
    if (!selected || !editTemplate) return;
    let renderValues = editValues;
    const photo = editValues.photo;
    if (!photo) {
      setSaveStatus("error");
      setSaveError("Gambar belum siap. Buka ulang konten ini sebelum menyimpan.");
      return;
    }
    if (!photo.startsWith("data:")) {
      const dataUri = await urlToDataUri(photo);
      if (!dataUri) {
        setSaveStatus("error");
        setSaveError("Gambar latar gagal dimuat. Buka ulang konten ini lalu coba lagi.");
        return;
      }
      renderValues = { ...editValues, photo: dataUri };
    }
    setSaveStatus("saving"); setSaveError(null);
    // Sematkan LOGO sebagai data URI juga, supaya server tak perlu fetch URL logo
    // (bisa gagal → logo jadi lingkaran placeholder di hasil export).
    let renderTpl = editTemplate;
    const logoUrl = editTemplate.brand.logoUrl;
    if (logoUrl && !logoUrl.startsWith("data:")) {
      const logoData = await urlToDataUri(logoUrl);
      if (logoData) renderTpl = { ...editTemplate, brand: { ...editTemplate.brand, logoUrl: logoData } };
    }
    try {
      const res = await fetch("/api/render", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(renderTpl, renderValues, selected.ratio)),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? "Gagal merender."); }
      const blob = await res.blob();
      downloadBlob(blob, `kevo-${selected.jenis}-${selected.id}.png`);
      const { photo: _photo, ...textValues } = editValues;
      const layoutState = {
        templateId: editTemplateId,
        ratio: selected.ratio,
        values: textValues,
        overrides,
        logoVariant: activeLogoVariant,
        bgColor: editBgColor,
        descCount: editDescCount,
      };
      const onImageText = editValues.title ?? editValues.caption ?? "";
      const form = new FormData();
      form.append("file", blob, "hasil.png");
      form.append("onImageText", onImageText);
      form.append("caption", selected.caption);
      form.append("layoutState", JSON.stringify(layoutState));
      await fetch(`/api/generate-auto/${selected.id}`, { method: "PATCH", body: form });
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  async function handleSchedule(date: string | null) {
    if (!selected) return;
    setScheduleStatus("saving");
    try {
      const res = await fetch(`/api/content/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: date }),
      });
      if (!res.ok) throw new Error();
      setSelected((s) => (s ? { ...s, scheduledDate: date } : s));
      setItems((cur) => cur.map((i) => (i.id === selected.id ? { ...i, scheduledDate: date } : i)));
      setScheduleStatus("saved");
    } catch {
      setScheduleStatus("error");
    }
  }

  async function handleShare(imageUrl: string, caption: string, filename: string) {
    const r = await shareContent(imageUrl, caption, filename);
    if (r === "fallback") {
      window.alert("Gambar diunduh & caption disalin. Buka Instagram → buat post baru → pilih gambarnya → tempel caption.");
    } else if (r === "error") {
      window.alert("Gagal membagikan. Coba lagi.");
    }
  }

  async function handleCopy(id: string, caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus konten ini? Tindakan ini permanen.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/generate-auto/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus.");
      setItems((cur) => cur.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {} finally { setDeletingId(null); }
  }

  const footerOverride = businessProfile && businessProfile.socials.entries.length > 0
    ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
    : null;

  const baseTemplate =
    editTemplateId === "produk-latar" ? createProdukLatarTemplate(editBgColor)
    : editTemplateId === "standar" ? createStandarTemplate(editDescCount ?? 1, editValues.title ?? editValues.caption)
    : editTemplateId === "teks-saja" ? createTeksSajaTemplate(editDescCount ?? 1)
    : editTemplateId === "carousel" ? createCarouselTemplate()
    : editTemplateId === "interaksi" ? interaksiTemplate
    : polosTemplate;
  // Logo: default versi TERANG saat konten muncul (fallback gelap). User bisa
  // ganti versi di editor (dobel-klik logo / tombol Terang-Gelap).
  const logoDark = businessProfile?.logo ?? null;
  const logoLight = businessProfile?.logoLight ?? null;
  const defaultLogoVariant: "dark" | "light" = logoLight ? "light" : "dark";
  const activeLogoVariant = overrides.logoVariant ?? defaultLogoVariant;
  const activeLogo = activeLogoVariant === "dark" ? (logoDark ?? logoLight) : (logoLight ?? logoDark);
  const templateBase = withLogoOverride(
    footerOverride && footerOverride.socials.length > 0
      ? withFooterOverride(baseTemplate, footerOverride.businessName, footerOverride.socials)
      : baseTemplate,
    activeLogo,
  );
  const editTemplate = selected ? applyEditorOverrides(templateBase, selected.ratio, overrides) : null;
  // Ghost = render Satori asli sebagai preview akurat. enabled hanya saat
  // previewMode → tidak ada render saat mode edit cepat (bebas lag).
  const { url: ghostUrl, rendering: ghostRendering } = useLiveRender(editTemplate, editValues, selected?.ratio ?? "4:5", !!selected && previewMode);

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-navy">Edit Konten</h1>
          <p className="mt-1 text-navy/60">Klik konten untuk buka editor — atur ulang dan Simpan Gambar.</p>
        </div>

        {selected && editTemplate ? (
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-navy">
                Edit — <span className="text-primary">{JENIS_LABEL[selected.jenis]}</span>
              </h2>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-navy/50 hover:text-navy">✕ Tutup</button>
            </div>
            <div className="mx-auto">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-navy/50">
                  {previewMode
                    ? "Hasil asli (persis yang akan diekspor)."
                    : "Mode edit cepat — geser bebas, tanpa jeda."}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    previewMode ? "bg-primary text-white hover:opacity-90" : "bg-navy/10 text-navy hover:bg-navy/15"
                  }`}
                >
                  {previewMode ? "✏ Edit cepat" : "👁 Lihat hasil asli"}
                </button>
              </div>
              <CanvasEditor
                layout={editTemplate.layouts[selected.ratio]}
                values={editValues}
                overrides={overrides}
                onOverridesChange={setOverrides}
                onTextChange={(slotId, value) => setEditValues((v) => ({ ...v, [slotId]: value }))}
                footerPreviewText={footerOverride?.socials[0]?.value}
                socials={footerOverride?.socials ?? []}
                businessName={businessProfile?.business.name}
                logoUrl={activeLogo?.url ?? null}
                logoVariant={activeLogoVariant}
                canToggleLogo={!!(logoDark && logoLight)}
                onLogoVariantChange={(v) => setOverrides((o) => ({ ...o, logoVariant: v }))}
                ghostUrl={previewMode ? (ghostUrl ?? undefined) : undefined}
                rendering={previewMode ? ghostRendering : false}
              />
              {previewMode && ghostRendering ? (
                <p className="mt-1 text-center text-[11px] text-navy/40">merender hasil asli…</p>
              ) : null}
            </div>
            <Textarea label="Caption" value={selected.caption} readOnly />
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-navy/70">Jadwal posting</span>
              <input
                type="date"
                value={selected.scheduledDate ?? ""}
                onChange={(e) => handleSchedule(e.target.value || null)}
                className="rounded-lg border border-line px-2 py-1 text-sm focus:border-primary focus:outline-none"
              />
              {selected.scheduledDate ? (
                <button type="button" onClick={() => handleSchedule(null)} className="text-xs text-red-500 hover:underline">
                  Batal jadwal
                </button>
              ) : null}
              {scheduleStatus === "saving" ? (
                <span className="text-xs text-navy/40">menyimpan...</span>
              ) : scheduleStatus === "saved" ? (
                <span className="text-xs text-primary">tersimpan</span>
              ) : scheduleStatus === "error" ? (
                <span className="text-xs text-red-600">gagal</span>
              ) : null}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleSimpanPng} disabled={saveStatus === "saving"}>
                {saveStatus === "saving" ? "Menyimpan..." : "Simpan Gambar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleCopy("edit", selected.caption)}>
                {copiedId === "edit" ? "Tersalin!" : "Salin Caption"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleShare(selected.imageUrl, selected.caption, `kevo-${selected.jenis}-${selected.id}.png`)}>
                Bagikan ke IG
              </Button>
              {saveStatus === "saved" ? <span className="text-sm font-medium text-primary">PNG Terunduh ✓</span> : null}
            </div>
            {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
          </Card>
        ) : null}

        <Card className="flex flex-col gap-4">
          {loading ? (
            <p className="text-sm text-navy/60">Memuat...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-navy/60">Belum ada konten. Generate dulu di halaman Otomatis.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((item) => (
                <div key={item.id}
                  className={`flex flex-col gap-2 rounded-2xl border p-2 cursor-pointer transition ${selected?.id === item.id ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-primary/40"}`}
                  onClick={() => openEdit(item)}>
                  <img src={item.imageUrl} alt={item.onImageText}
                    className="aspect-square w-full rounded-xl border border-line object-cover" />
                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {JENIS_LABEL[item.jenis]}
                  </span>
                  {item.scheduledDate ? (
                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${item.scheduledDate === todayStr() ? "bg-amber-100 text-amber-700" : "bg-navy/5 text-navy/60"}`}>
                      {item.scheduledDate === todayStr() ? "📅 Hari ini" : `📅 ${item.scheduledDate}`}
                    </span>
                  ) : null}
                  <p className="line-clamp-2 text-xs text-navy/60">{item.caption}</p>
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      className="text-xs font-medium text-primary hover:underline">Edit</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(item.id, item.caption); }}
                      className="text-xs font-medium text-primary hover:underline">
                      {copiedId === item.id ? "Tersalin!" : "Salin Caption"}
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleShare(item.imageUrl, item.caption, `kevo-${item.jenis}-${item.id}.png`); }}
                      className="text-xs font-medium text-primary hover:underline">Bagikan</button>
                    <button type="button" disabled={deletingId === item.id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50">
                      {deletingId === item.id ? "..." : "Hapus"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Logo bisnis dipindah ke sini (dulu di Dashboard) — dekat dengan
            tempat logo dipakai: saat mengedit konten. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">Logo Bisnis</h2>
          <LogoSettings />
        </section>
      </main>
    </>
  );
}
