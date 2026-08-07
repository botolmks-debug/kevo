"use client";

import { getLang, type Lang } from "@/lib/i18n";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  jawaban?: string;
  ratio: AspectRatio;
  status: string;
  createdAt: string;
};

type Status = "idle" | "loading" | "error" | "success";

const JENIS_OPTIONS: { value: GeneratedContentJenis | "referensi"; label: string; en: string; description: string; descEn: string }[] = [
  { value: "produk", label: "Dari Foto", en: "From Photo", description: "Pakai foto (produk, ruangan, atau orang) yang sudah diupload. AI mempercantik sesuai kategori.", descEn: "Use an uploaded photo (product, space, or person). AI enhances it to match the category." },
  { value: "referensi", label: "Referensi", en: "Reference", description: "Tiru gaya dari 1 contoh konten. Pilih 1 foto produk + unggah 1 gambar referensi.", descEn: "Copy the style from 1 example. Pick 1 product photo + upload 1 reference." },
  { value: "general", label: "General", en: "General", description: "AI generate gambar & isi konten dari nol.", descEn: "AI generates the image & content from scratch." },
  { value: "interaksi", label: "Interaksi", en: "Interaction", description: "AI tentukan sendiri isi konten (kuis/quote/tips).", descEn: "AI decides the content itself (quiz/quote/tips)." },
];

const RATIO_OPTIONS: { value: AspectRatio; label: string; en: string }[] = [
  { value: "4:5", label: "Feed (4:5)", en: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)", en: "Square (1:1)" },
  { value: "9:16", label: "Story (9:16)", en: "Story (9:16)" },
];

const JENIS_LABEL: Record<GeneratedContentJenis, { id: string; en: string }> = {
  produk: { id: "Produk", en: "Product" },
  general: { id: "General", en: "General" },
  interaksi: { id: "Interaksi", en: "Interaction" },
};

// Dua gangguan sesaat bisa bikin request gagal walau semuanya sebenarnya baik:
// (1) 401 "Belum login" saat token akses sedang diputar (refresh-token rotation),
// (2) "fetch failed" saat jaringan ngeblip / dev server sedang recompile.
// Untuk keduanya, coba sekali lagi setelah jeda singkat — percobaan kedua
// hampir selalu berhasil, jadi gangguan sesaat itu tak sampai terlihat user.
// Hanya untuk GET/DELETE (aman diulang), bukan untuk generate (POST).
async function fetchWithAuthRetry(input: string, init?: RequestInit): Promise<Response> {
  const attempt = () => fetch(input, init);
  try {
    const res = await attempt();
    if (res.status !== 401) return res;
  } catch {
    // kegagalan jaringan sesaat — lanjut ke retry di bawah
  }
  await new Promise((r) => setTimeout(r, 500));
  return attempt();
}

export function AutoGenerate() {
  const [jenis, setJenis] = useState<GeneratedContentJenis | "referensi">("produk");
  const [uiLang, setUiLang] = useState<Lang>("en");
  useEffect(() => setUiLang(getLang()), []);
  const L = (id: string, en: string) => (uiLang === "en" ? en : id);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<Status>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedItem | null>(null);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharedBlob, setSharedBlob] = useState<Blob | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editorOverrides, setEditorOverrides] = useState<EditorOverrides>({ slots: {} });
  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kunci keras supaya generate tidak pernah jalan dobel (klik/efek beruntun),
  // apa pun kondisi state async-nya.
  const generatingRef = useRef(false);

  async function loadHistory() {
    setHistoryError(null);
    try {
      const res = await fetchWithAuthRetry("/api/generate-auto");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? L("Gagal memuat riwayat konten.", "Failed to load content history."));
      setHistory(data?.items ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : L("Gagal memuat riwayat konten.", "Failed to load content history."));
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/images")
      .then((res) => res.json())
      .then((data: { images?: PickableImage[] }) => {
        if (cancelled) return;
        setImages((data?.images ?? []).filter((image) => image.usage === "olah_ai" && ["Produk", "Makanan/Minuman", "Kecantikan/Skincare", "Software/Website", "Wajah/Orang", "Suasana/Fasilitas"].includes(image.category)));
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
    fetchWithAuthRetry("/api/generate-auto")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setHistoryError(data?.error ?? L("Gagal memuat riwayat konten.", "Failed to load content history."));
          return;
        }
        setHistory(data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryError(L("Gagal memuat riwayat konten.", "Failed to load content history."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [refDataUri, setRefDataUri] = useState<string | null>(null); // referensi gaya (konten manual)

  function handleRefFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      setRefDataUri(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function handleGenerate(ratioArg?: AspectRatio) {
    if (generatingRef.current) return; // sudah ada proses generate berjalan
    if ((jenis === "produk" || jenis === "referensi") && selectedImageIds.length === 0) {
      setGenerateStatus("error");
      setGenerateError(L("Pilih minimal satu foto dulu.", "Pick at least one photo first."));
      return;
    }
    if (jenis === "referensi" && !refDataUri) {
      setGenerateStatus("error");
      setGenerateError(L("Unggah 1 gambar referensi dulu.", "Upload 1 reference image first."));
      return;
    }
    generatingRef.current = true;
    setGenerateStatus("loading");
    setGenerateError(null);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      const doPost = () =>
        fetch("/api/generate-auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jenis: jenis === "referensi" ? "produk" : jenis,
            ratio: ratioArg && RATIO_OPTIONS.some((o) => o.value === ratioArg) ? ratioArg : ratio,
            imageIds: jenis === "produk" || jenis === "referensi" ? selectedImageIds : undefined,
            language: getLang(),
            referenceDataUri: jenis === "referensi" ? (refDataUri ?? undefined) : undefined,
          }),
        });
      let res = await doPost();
      // 401 "Belum login" ditolak di gerbang auth SEBELUM generate jalan — belum
      // ada token yang kepotong, jadi aman diulang SEKALI setelah sesi ter-refresh.
      // Hanya untuk 401, TIDAK untuk kegagalan jaringan (biar tak dobel-generate).
      if (res.status === 401) {
        await new Promise((r) => setTimeout(r, 500));
        res = await doPost();
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? L("Gagal generate konten.", "Failed to generate content."));

      const item: GeneratedItem = data.item;
      setResult(item);
      setSharedBlob(null);
      // Editor pakai gambar BERSIH (backgroundDataUri) supaya tidak dobel overlay.
      setEditValues({ photo: item.backgroundDataUri ?? item.imageUrl, caption: item.onImageText });
      const fontId = (data.item as any).fontId;
      const fontMatch = fontId ? FONT_OPTIONS.find((f) => f.id === fontId) : null;
      setEditorOverrides({ slots: fontMatch ? { caption: { fontFamily: fontMatch.family } } : {} });
      setGenerateStatus("success");
      await loadHistory();
    } catch (error) {
      setGenerateStatus("error");
      setGenerateError(error instanceof Error ? error.message : L("Gagal generate konten.", "Failed to generate content."));
    } finally {
      generatingRef.current = false;
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
    if (!window.confirm(L("Hapus konten ini dari riwayat? Tindakan ini permanen.", "Delete this content from history? This action is permanent."))) return;
    setDeletingId(id);
    setHistoryError(null);
    try {
      const res = await fetchWithAuthRetry(`/api/generate-auto/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? L("Gagal menghapus konten.", "Failed to delete content."));
      setHistory((cur) => cur.filter((it) => it.id !== id));
      setResult((cur) => (cur && cur.id === id ? null : cur));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : L("Gagal menghapus konten.", "Failed to delete content."));
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
    if (sharing || !result) return;
    if (!sharedBlob) {
      window.alert("Tekan 'Simpan Gambar' dulu, lalu 'Bagikan ke IG'.");
      return;
    }
    setSharing(true);
    try {
      const r = await shareContent(sharedBlob, result.caption, `kevo-${result.jenis}-${result.id}.png`);
      if (r === "fallback") {
        window.alert(L("Gambar diunduh & caption disalin. Buka Instagram → post baru → pilih gambar → tempel caption.", "Image downloaded & caption copied. Open Instagram → new post → pick the image → paste the caption."));
      } else if (r === "error") {
        window.alert(L("Gagal membagikan. Coba lagi.", "Failed to share. Try again."));
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleSimpanPng() {
    if (!result || !editTemplate) return;
    if (!editValues.photo) {
      // Jangan pernah simpan render tanpa foto — hasilnya cuma teks di atas
      // latar hitam dan akan menimpa baris Riwayat yang tadinya bagus.
      setSaveStatus("error");
      setSaveError(L("Gambar belum siap. Generate ulang dulu sebelum menyimpan.", "Image not ready yet. Regenerate before saving."));
      return;
    }
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
        throw new Error(data?.error ?? L("Gagal merender.", "Failed to render."));
      }
      const blob = await res.blob();

      downloadBlob(blob, `kevo-${result.jenis}-${result.id}.png`);
      setSharedBlob(blob);

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
      setSaveError(error instanceof Error ? error.message : L("Gagal menyimpan.", "Failed to save."));
    }
  }

  const isGenerating = generateStatus === "loading";
  const isSaving = saveStatus === "loading";

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-navy">{L("Generate Otomatis", "Auto Generate")}</h3>
        <p className="text-sm text-navy/60">
          {L("AI membuat gambar, headline, dan caption. Setelah muncul, tinggal atur posisinya lalu Simpan Gambar.", "AI creates the image, headline, and caption. Once it appears, just position it and Save Image.")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-navy">{L("Jenis konten", "Content type")}</span>
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
                <span className={`font-semibold ${active ? "text-primary" : "text-navy"}`}>{uiLang === "en" ? opt.en : opt.label}</span>
                <span className="text-xs text-navy/60">{uiLang === "en" ? opt.descEn : opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {jenis === "produk" || jenis === "referensi" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">{jenis === "referensi" ? L("Pilih 1 foto produk", "Select 1 product photo") : L("Pilih foto produk (bisa 1–5, centang >1 untuk digabung)", "Select product photos (1–5, tick >1 to combine)")}</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <span className={selectedImageIds.length ? "text-navy" : "text-navy/50"}>
                {selectedImageIds.length === 0
                  ? L("Pilih gambar...", "Select image...")
                  : `${selectedImageIds.length} ${L("produk dipilih", "products selected")}${selectedImageIds.length > 1 ? L(" — akan digabung", " — will be combined") : ""}`}
              </span>
              <span className="text-navy/40">{pickerOpen ? "▲" : "▼"}</span>
            </button>
            {pickerOpen ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-white p-1 shadow-lg">
                {images.map((image) => {
                  const checked = selectedImageIds.includes(image.id);
                  const atLimit = (jenis === "referensi" ? selectedImageIds.length >= 1 : selectedImageIds.length >= 5) && !checked;
                  return (
                    <label
                      key={image.id}
                      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${atLimit ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-navy/5"}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-primary"
                        checked={checked}
                        disabled={atLimit}
                        onChange={() => {
                          if (jenis === "referensi") {
                            setSelectedImageIds((prev) => (prev.includes(image.id) ? [] : [image.id]));
                            return;
                          }
                          setSelectedImageIds((prev) =>
                            prev.includes(image.id)
                              ? prev.filter((id) => id !== image.id)
                              : prev.length >= 5
                                ? prev
                                : [...prev, image.id],
                          );
                        }}
                      />
                      <span className="text-navy">
                        {(image.description || L("(tanpa deskripsi)", "(no description)"))} — <span className="text-navy/50">{image.category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
          {selectedImageIds.length >= 5 ? (
            <p className="text-xs text-navy/50">{L("Maksimal 5 produk.", "Maximum 5 products.")}</p>
          ) : null}
          {images.length === 0 ? (
            <p className="text-xs text-navy/50">
              {L("Belum ada foto (produk/ruangan/orang) yang boleh diolah AI. Unggah dulu di Database Gambar (pilih \"Boleh diolah AI\").", "No photos (product/space/person) are enabled for AI yet. Upload them first in the Image Database (choose \"Allow AI\").")}
            </p>
          ) : null}

          {jenis === "referensi" ? (
          <div className="mt-1 rounded-2xl border border-dashed border-line bg-navy/[0.02] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-navy">{L("Gambar referensi (wajib)", "Reference image (required)")}</span>
              {refDataUri ? (
                <button type="button" onClick={() => setRefDataUri(null)} className="text-xs text-navy/50 hover:text-navy">{L("Hapus", "Remove")}</button>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-navy/50">{L("Unggah 1 contoh konten — AI meniru konsep, komposisi, dan mood-nya untuk fotomu (produk tetap sama).", "Upload 1 example — AI mimics its concept, composition, and mood for your photo (product stays the same).")}</p>
            {refDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={refDataUri} alt="Referensi" className="mt-2 h-28 w-auto rounded-lg border border-line object-cover" />
            ) : (
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy shadow-sm ring-1 ring-line transition hover:bg-navy/5">
                {L("Pilih gambar referensi", "Choose reference image")}
                <input type="file" accept="image/*" className="hidden" onChange={handleRefFile} />
              </label>
            )}
          </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-navy">{L("Ukuran", "Size")}</span>
        <div className="flex flex-wrap gap-2">
          {RATIO_OPTIONS.map((opt) => {
            const active = ratio === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isGenerating}
                onClick={() => setRatio(opt.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-line text-navy hover:bg-navy/5"
                }`}
              >
                {uiLang === "en" ? opt.en : opt.label}
              </button>
            );
          })}
        </div>
        {result ? (
          <span className="text-xs text-navy/50">{L("Ganti ukuran, lalu tekan \"Generate Otomatis\" lagi untuk membuat ulang di ukuran itu (1 token).", "Change the size, then press \"Auto Generate\" again to remake it at that size (1 token).")}</span>
        ) : null}
      </div>

      <Button type="button" variant="cta" onClick={() => handleGenerate()} disabled={isGenerating} className="w-fit">
        {isGenerating ? L("Sedang membuat...", "Generating...") : L("Generate Otomatis", "Auto Generate")}
      </Button>

      {generateError ? <p className="text-sm text-red-600">{generateError}</p> : null}

      {result && editTemplate ? (
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface/50 p-5">
          <p className="text-sm font-medium text-navy">
            {L("Atur posisi teks, logo, dan sosmed langsung di gambar, lalu Simpan Gambar.", "Position the text, logo, and socials right on the image, then Save Image.")}
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

          <Textarea label={L("Caption (bisa disalin)", "Caption (copyable)")} value={result.caption} readOnly />

          {result.jawaban ? (
            <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-navy/80">
              <p className="mb-1 font-semibold text-primary">{L("💡 Jawaban / Pembahasan (buat kamu — tidak ikut diposting)", "💡 Answer / Explanation (for you — not posted)")}</p>
              <p>{result.jawaban}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSimpanPng} disabled={isSaving}>
              {isSaving ? L("Menyimpan...", "Saving...") : L("Simpan Gambar", "Save Image")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleCopyCaption("result", result.caption)}>
              {copiedId === "result" ? L("Tersalin!", "Copied!") : L("Salin Caption", "Copy Caption")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleShareIg} disabled={sharing}>
              {sharing ? L("Menyiapkan...", "Preparing...") : L("Bagikan ke IG", "Share to IG")}
            </Button>
            {saveStatus === "success" ? <span className="text-sm font-medium text-primary">{L("Tersimpan ke Riwayat ✓", "Saved to History ✓")}</span> : null}
          </div>
          {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-navy">{L("Riwayat", "History")}</h4>
        {historyError ? <p className="text-sm text-red-600">{historyError}</p> : null}
        {history.length === 0 ? (
          <p className="text-xs text-navy/50">{L("Belum ada konten yang digenerate.", "No content generated yet.")}</p>
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
                  {uiLang === "en" ? JENIS_LABEL[item.jenis].en : JENIS_LABEL[item.jenis].id}
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
                    {copiedId === item.id ? L("Tersalin!", "Copied!") : L("Salin Caption", "Copy Caption")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deletingId === item.id ? L("Menghapus...", "Deleting...") : L("Hapus", "Delete")}
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
