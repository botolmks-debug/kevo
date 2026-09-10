"use client";

import { getLang, type Lang } from "@/lib/i18n";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { BusyToast } from "@/components/ui/BusyToast";
import { GenerateLoadingOverlay } from "@/components/generate/GenerateLoadingOverlay";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { DomEditor } from "@/components/editor/DomEditor";
import * as htmlToImage from "html-to-image";
import { applyEditorOverrides, type EditorOverrides, type FreeItem } from "@/lib/editor/layoutOverrides";
import type { ImageUsage } from "@/lib/images/categories";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import type { GeneratedContentJenis } from "@/lib/supabase/generatedContent";
import { polosTemplate } from "@/lib/templates/polos";
import { interaksiTemplate } from "@/lib/templates/interaksi";
import type { AspectRatio, Template } from "@/lib/templates/types";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import { shareContent } from "@/lib/share";
import { ReferenceTermsModal, hasAcceptedReferenceTerms } from "@/components/generate-otomatis/ReferenceTermsModal";
import { CarouselAuto } from "@/components/generate-otomatis/CarouselAuto";
import { EmptyGalleryNotice } from "@/components/ui/EmptyGalleryNotice";

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
  // Art Director (eksperimental) — kalau ada, editor DOM WAJIB pakai template
  // ini (bukan rekonstruksi polos/interaksi) supaya subjudul+badge ikut tampil.
  usedArtDirector?: boolean;
  artDirectorTemplate?: Template;
  artDirectorValues?: Record<string, string>;
  artDirectorItems?: FreeItem[];
};

type Status = "idle" | "loading" | "error" | "success";

const JENIS_OPTIONS: { value: GeneratedContentJenis | "referensi" | "carousel"; label: string; en: string; description: string; descEn: string; icon?: string; badge?: string; badgeEn?: string }[] = [
  { value: "produk", label: "Dari Foto", en: "From Photo", description: "Pakai foto (produk, ruangan, atau orang) yang sudah diupload. AI mempercantik sesuai kategori.", descEn: "Use an uploaded photo (product, space, or person). AI enhances it to match the category." },
  { value: "referensi", label: "Referensi", en: "Reference", description: "Tiru gaya dari 1 contoh konten. Pilih 1 foto produk + unggah 1 gambar referensi.", descEn: "Copy the style from 1 example. Pick 1 product photo + upload 1 reference." },
  { value: "general", label: "General", en: "General", description: "AI generate gambar & isi konten dari nol.", descEn: "AI generates the image & content from scratch." },
  { value: "interaksi", label: "Interaksi", en: "Interaction", description: "AI tentukan sendiri isi konten (kuis/quote/tips).", descEn: "AI decides the content itself (quiz/quote/tips)." },
  { value: "carousel", label: "Carousel (4 Slide)", en: "Carousel (4 Slides)", description: "Pilih 1 fotomu (jadi slide penutup). AI buat teks 4 slide + 3 gambar yang mengalir ke fotomu.", descEn: "Pick 1 of your photos (final slide). AI writes 4 slides + 3 images flowing into your photo." },
  { value: "berita", icon: "📰", badge: "Baru", badgeEn: "New", label: "Konten Berita", en: "News Content", description: "TANPA perlu foto — AI cari berita terbaru seputar industrimu, lalu tulis reaksi/opini original + gambar siluet. Beda tema dari post promosi biasa.", descEn: "NO photo needed — AI finds recent news in your industry, then writes an original reaction/opinion + a silhouette image. A different theme from your usual promo posts." },
];

const TEMA_OPTIONS: { value: ContentTema; icon: string; label: string; en: string; description: string; descEn: string }[] = [
  { value: "hook", icon: "🔥", label: "Hook Konten", en: "Hook Content", description: "Judul & gambar dibuat penahan-scroll, bikin penasaran (tetap jujur sesuai produk).", descEn: "Headline & image crafted to stop the scroll and spark curiosity (still honest to the product)." },
  { value: "edukasi", icon: "📚", label: "Edukasi", en: "Educational", description: "Judul & caption berisi insight/fakta yang berguna, gambar bernuansa informatif.", descEn: "Headline & caption share a useful insight/fact, image has an informative feel." },
  { value: "produk", icon: "🔍", label: "Penjelasan Produk", en: "Product Detail", description: "Judul & caption jelaskan detail produk (bahan/ukuran/manfaat), gambar close-up ke detail.", descEn: "Headline & caption explain product detail (material/size/benefit), image close-up on detail." },
  { value: "promo", icon: "🛒", label: "Promo / Ajakan Beli", en: "Promo / Call-to-Buy", description: "Judul & caption soft-selling dengan ajakan jelas, gambar suasana siap dipakai/dinikmati.", descEn: "Headline & caption soft-sell with a clear call-to-action, image shows ready-to-use context." },
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
  video_cerita: { id: "Video Cerita", en: "Story Video" },
  berita: { id: "Berita", en: "News" },
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

export type ContentTema = "hook" | "edukasi" | "produk" | "promo";

// Fitur Art Director (Desain Lengkap AI + Tracing) DISEMBUNYIKAN dari UI
// sementara (10 Sep 2026) — validasi ejaan masih sering false-positive/gagal,
// belum stabil untuk user umum. Kode & backend TETAP UTUH, tinggal balik ke
// `true` kapan saja setelah lebih matang, tanpa perlu tulis ulang apa pun.
const SHOW_ART_DIRECTOR_UI = false;

export function AutoGenerate() {
  const [jenis, setJenis] = useState<GeneratedContentJenis | "referensi" | "carousel">("produk");
  const [tema, setTema] = useState<ContentTema | null>(null); // pilihan tema konten (judul+deskripsi+gambar)
  const [konsep, setKonsep] = useState(""); // arahan bebas dari user (opsional) — kalau diisi, jadi prioritas di atas tema
  // Popup "5 pilihan judul dulu" — khusus jenis "produk". null = popup tidak
  // tampil. Array = tampil dengan pilihan ini. produkDesc disimpan dari
  // respons /titles supaya generate final TIDAK perlu describeProductImage
  // ulang (hemat 1 panggilan vision-AI yang sama persis).
  const [titleChoices, setTitleChoices] = useState<{ titles: string[]; produkDesc: string; formatLabel?: string; ratioArg?: AspectRatio } | null>(null);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>("id");
  useEffect(() => setUiLang(getLang()), []);
  const L = (id: string, en: string) => (uiLang === "en" ? en : id);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [images, setImages] = useState<PickableImage[]>([]);
  // Untuk banner "galeri kosong" — tampil hanya SETELAH daftar gambar selesai dimuat.
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<Status>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedItem | null>(null);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // Editor DOM v4 (default) — toggle ke editor lama tetap tersedia.
  const [domMode, setDomMode] = useState(true);
  const [useArtDirector, setUseArtDirector] = useState(false);
  const [useTracing, setUseTracing] = useState(false);
  const domRef = useRef<HTMLDivElement | null>(null);
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

  // Modal T&C fitur Referensi — muncul saat user pertama kali generate dengan jenis "referensi"
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const pendingRatioRef = useRef<AspectRatio | undefined>(undefined);

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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setImagesLoaded(true);
      });
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

  async function handleGenerate(ratioArg?: AspectRatio, locked?: { title: string; produkDesc: string; formatLabel?: string }) {
    if (jenis === "carousel") return; // carousel punya alur generate sendiri (CarouselAuto)
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
    // Cek T&C fitur Referensi — kalau belum accept, tampilkan modal dan tunggu
    if (jenis === "referensi" && !hasAcceptedReferenceTerms()) {
      pendingRatioRef.current = ratioArg;
      setShowReferenceModal(true);
      return;
    }
    // "Dari Foto" (produk), "Referensi", "General", & "Interaksi" TANPA
    // judul terkunci — ambil 5 pilihan judul dulu, tampilkan popup, JANGAN
    // lanjut generate gambar sampai user pilih satu. Referensi numpang infra
    // produk (titles cuma butuh foto+deskripsi produk, bukan gambar
    // referensi gayanya — referenceDataUri baru dipakai di tahap generate
    // gambar FINAL). General & Interaksi tidak butuh foto sama sekali.
    if ((jenis === "produk" || jenis === "referensi" || jenis === "general" || jenis === "interaksi") && !locked) {
      if (generatingRef.current) return;
      generatingRef.current = true;
      setTitlesLoading(true);
      setGenerateStatus("idle");
      setGenerateError(null);
      try {
        const titlesJenis = jenis === "referensi" ? "produk" : jenis; // server /titles cuma kenal produk/general/interaksi
        const res = await fetch("/api/generate-auto/titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jenis: titlesJenis,
            imageIds: (jenis === "produk" || jenis === "referensi") ? selectedImageIds : undefined,
            language: getLang(),
            tema: tema ?? undefined,
            konsep: konsep.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? L("Gagal ambil pilihan judul.", "Failed to get title options."));
        setTitleChoices({
          titles: data.titles as string[],
          produkDesc: (data.produkDesc as string) ?? "",
          formatLabel: data.formatLabel as string | undefined,
          ratioArg,
        });
      } catch (error) {
        setGenerateStatus("error");
        setGenerateError(error instanceof Error ? error.message : L("Gagal ambil pilihan judul.", "Failed to get title options."));
      } finally {
        setTitlesLoading(false);
        generatingRef.current = false;
      }
      return;
    }
    generatingRef.current = true;
    setGenerateStatus("loading");
    setGenerateError(null);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      // "Berita" TANPA foto/tema — endpoint & body-nya beda total dari jenis lain
      // (AI cari beritanya sendiri, bukan mengolah foto yang user pilih).
      const doPost = () =>
        jenis === "berita"
          ? fetch("/api/generate-news", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ratio: ratioArg && RATIO_OPTIONS.some((o) => o.value === ratioArg) ? ratioArg : ratio,
                language: getLang(),
                konsep: konsep.trim() || undefined,
              }),
            })
          : fetch("/api/generate-auto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jenis: jenis === "referensi" ? "produk" : jenis,
                ratio: ratioArg && RATIO_OPTIONS.some((o) => o.value === ratioArg) ? ratioArg : ratio,
                imageIds: jenis === "produk" || jenis === "referensi" ? selectedImageIds : undefined,
                language: getLang(),
                referenceDataUri: jenis === "referensi" ? (refDataUri ?? undefined) : undefined,
                // Tema hanya relevan utk produk/referensi/general (bukan interaksi)
                tema: tema && (jenis === "produk" || jenis === "referensi") ? tema : undefined,
                // Konsep bebas dari user — cuma relevan utk Dari Foto/Referensi (ada foto produk)
                konsep: konsep.trim() && (jenis === "produk" || jenis === "referensi") ? konsep.trim() : undefined,
                // Judul yang sudah dipilih user dari popup 5-judul
                lockedTitle: locked ? locked.title : undefined,
                produkDescOverride: locked ? locked.produkDesc : undefined,
                // Format Interaksi (Kuis/Edukasi/dst) yang dikunci dari tahap
                // /titles — WAJIB dipakai ulang PERSIS sama di tahap ini.
                formatLabel: locked?.formatLabel,
                // AI Art Director (eksperimental) — cuma efektif utk jenis "produk"
                // dgn 1 foto (bukan gabung); route.ts yang menyaring sisanya.
                useArtDirector: (jenis === "produk" || jenis === "referensi") ? useArtDirector : undefined,
                useTracing: (jenis === "produk" || jenis === "referensi") && useArtDirector ? useTracing : undefined,
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
      // Kalau Art Director dipakai, sertakan juga subjudul+badge supaya editor
      // (DOM) bisa menampilkan & mengedit slot-slot tambahan itu.
      setEditValues({
        photo: item.backgroundDataUri ?? item.imageUrl,
        caption: item.onImageText,
        ...(item.usedArtDirector && item.artDirectorValues ? item.artDirectorValues : {}),
      });
      const fontId = (data.item as any).fontId;
      const fontMatch = fontId ? FONT_OPTIONS.find((f) => f.id === fontId) : null;
      setEditorOverrides({
        slots: fontMatch ? { caption: { fontFamily: fontMatch.family } } : {},
        // Badge (ikon+label) Art Director masuk sebagai elemen bebas ("+Gambar"/"+Teks")
        // yang SUDAH bisa digeser/diubah ukuran lewat editor DOM yang sudah ada —
        // tidak perlu kode editor baru sama sekali.
        items: item.usedArtDirector && item.artDirectorItems ? item.artDirectorItems : [],
      });
      setGenerateStatus("success");
      await loadHistory();
    } catch (error) {
      setGenerateStatus("error");
      setGenerateError(error instanceof Error ? error.message : L("Gagal generate konten.", "Failed to generate content."));
    } finally {
      generatingRef.current = false;
    }
  }

  /** Dipanggil pas user klik salah satu dari 5 kartu judul di popup. */
  function handlePickTitle(title: string) {
    if (!titleChoices) return;
    const ratioArg = titleChoices.ratioArg;
    const produkDesc = titleChoices.produkDesc;
    const formatLabel = titleChoices.formatLabel;
    setTitleChoices(null);
    void handleGenerate(ratioArg, { title, produkDesc, formatLabel });
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
  // KECUALI kalau Art Director dipakai — template ASLI dari server (lengkap
  // subjudul+badge) dipakai LANGSUNG, bukan direkonstruksi dari polos/interaksi
  // (rekonstruksi lama tidak tahu apa-apa soal slot Art Director → badge hilang).
  const autoBaseTemplate =
    result?.usedArtDirector && result.artDirectorTemplate
      ? result.artDirectorTemplate
      : result?.jenis === "interaksi" ? interaksiTemplate : polosTemplate;
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
      if (domMode && domRef.current) {
        // EDITOR DOM: potret elemen yang diedit → PNG (edit = hasil, identik).
        // Gagal (browser lama/HP) → lanjut otomatis ke jalur Satori di bawah.
        let b: Blob | null = null;
        try {
          await document.fonts.ready;
          const pr = editTemplate.layouts[result.ratio].canvas.width / 340;
          b = await htmlToImage.toBlob(domRef.current, {
            pixelRatio: pr, cacheBust: true, backgroundColor: "#111",
            filter: (n) => !(n instanceof HTMLElement && n.dataset?.noexport),
          });
        } catch (err) {
          console.log("[DOM export] gagal, fallback ke Satori:", err);
        }
        if (b) {
          downloadBlob(b, `kevo-${result.jenis}-${result.id}.png`);
          setSharedBlob(b);
          const fd = new FormData();
          fd.append("file", b, "hasil.png");
          fd.append("onImageText", editValues.caption ?? "");
          fd.append("caption", result.caption);
          await fetch(`/api/generate-auto/${result.id}`, { method: "PATCH", body: fd });
          await loadHistory();
          setSaveStatus("success");
          return;
        }
      }
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
            const isBerita = opt.value === "berita";
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setJenis(opt.value)}
                className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:shadow-sm ${
                  active
                    ? isBerita
                      ? "border-transparent bg-gradient-to-br from-primary/15 via-primary/5 to-amber-100/40 ring-2 ring-primary/30"
                      : "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : isBerita
                      ? "border-primary/30 bg-gradient-to-br from-primary/[0.04] to-amber-50/40 hover:border-primary/50 hover:from-primary/10"
                      : "border-line hover:border-primary/40 hover:bg-navy/[0.02]"
                }`}
              >
                {opt.badge ? (
                  <span className="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                    {uiLang === "en" ? opt.badgeEn ?? opt.badge : opt.badge}
                  </span>
                ) : null}
                <span className={`flex items-center gap-1.5 font-semibold ${active ? "text-primary" : "text-navy"}`}>
                  {opt.icon ? <span className="text-base leading-none">{opt.icon}</span> : null}
                  {uiLang === "en" ? opt.en : opt.label}
                </span>
                <span className="text-xs text-navy/60">{uiLang === "en" ? opt.descEn : opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {jenis === "produk" || jenis === "referensi" || jenis === "berita" ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-navy">
            {jenis === "berita"
              ? L("Cari berita tentang topik tertentu (opsional)", "Search news about a specific topic (optional)")
              : L("Konsep (opsional)", "Concept (optional)")}
          </span>
          <textarea
            value={konsep}
            onChange={(e) => setKonsep(e.target.value)}
            placeholder={
              jenis === "berita"
                ? L(
                    "Tulis topik spesifik yang mau dibahas, mis. \"ChatGPT Astra\" atau \"kenaikan harga BBM\" — AI akan cari berita soal itu. Kosongkan kalau mau AI pilih sendiri berita seputar industrimu.",
                    "Write a specific topic to cover, e.g. \"ChatGPT Astra\" — AI will search for news about it. Leave empty to let AI pick news from your industry on its own.",
                  )
                : L(
                    "Tulis arahan bebas kalau ada ide spesifik (mis. \"suasana pagi hari, nuansa hangat, buat yang lagi buru-buru berangkat kerja\"). Kosongkan kalau mau AI tentukan sendiri dari data produk & bisnismu.",
                    "Write a free-form direction if you have a specific idea (e.g. \"morning vibe, warm mood, for people rushing to work\"). Leave empty to let AI decide from your product & business data.",
                  )
            }
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {konsep.trim() && jenis !== "berita" ? (
            <span className="text-xs text-primary/80">
              {L("Konsep ini akan diutamakan — mengalahkan Tema di bawah kalau bertentangan.", "This concept takes priority — it overrides the Theme below if they conflict.")}
            </span>
          ) : null}
        </div>
      ) : null}

      {jenis === "produk" || jenis === "referensi" ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-navy">
            {L("Tema konten (opsional)", "Content theme (optional)")}
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMA_OPTIONS.map((opt) => {
              const active = tema === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTema((v) => (v === opt.value ? null : opt.value))}
                  aria-pressed={active}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:shadow-sm ${
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-line hover:border-primary/40 hover:bg-navy/[0.02]"
                  }`}
                >
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className={`text-sm font-semibold ${active ? "text-primary" : "text-navy"}`}>
                      {uiLang === "en" ? opt.en : opt.label}
                    </span>
                    <span className="text-xs text-navy/60">{uiLang === "en" ? opt.descEn : opt.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {jenis === "berita" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-amber-50/50 p-4">
          <span className="text-2xl leading-none">🗞️</span>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-navy">
              {L("Tidak perlu pilih foto — AI kerjakan semuanya", "No photo needed — AI handles everything")}
            </span>
            <span className="text-xs text-navy/60">
              {L(
                "AI cari 1 berita terbaru yang relevan dengan industrimu, tulis reaksi/opini original (bukan copy-paste), dan buat gambar siluet yang sesuai suasananya — bukan foto orang sungguhan dari beritanya.",
                "AI finds one recent news story relevant to your industry, writes an original reaction/opinion (not a copy-paste), and creates a matching silhouette image — not a real photo of anyone from the story.",
              )}
            </span>
          </div>
        </div>
      ) : null}

      {imagesLoaded && images.length === 0 && (jenis === "produk" || jenis === "referensi" || jenis === "carousel") ? (
        <EmptyGalleryNotice />
      ) : null}

      {jenis === "carousel" ? (
        <CarouselAuto businessProfile={businessProfile} images={images} />
      ) : null}

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

      {jenis !== "carousel" ? (
      <>
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

      <div className="flex flex-col gap-1.5">
        {SHOW_ART_DIRECTOR_UI && (jenis === "produk" || jenis === "referensi") ? (
          <>
          <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-line bg-navy/[0.02] px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={useArtDirector}
              onChange={(e) => {
                setUseArtDirector(e.target.checked);
                if (!e.target.checked) setUseTracing(false); // tracing cuma relevan kalau desain lengkap aktif
              }}
            />
            <span>
              <span className="font-medium text-navy">{L("Coba Desain Lengkap AI (eksperimental)", "Try Full AI Design (experimental)")}</span>
              <br />
              <span className="text-xs text-navy/50">
                {L("AI mendesain judul+subjudul+highlight langsung di gambar (dicek ejaannya otomatis). Hasilnya SATU gambar jadi, teksnya tidak bisa digeser/diedit lagi. Kena +1 token tambahan.", "AI designs headline+subheadline+highlights directly into the image (spelling auto-checked). Result is ONE finished image, text can't be repositioned/edited afterward. Costs +1 extra token.")}
              </span>
            </span>
          </label>
          {useArtDirector ? (
            <label className="ml-6 flex cursor-pointer items-start gap-2 rounded-2xl border border-dashed border-line bg-navy/[0.02] px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-primary"
                checked={useTracing}
                onChange={(e) => setUseTracing(e.target.checked)}
              />
              <span>
                <span className="font-medium text-navy">{L("+ Coba jadikan teksnya bisa diedit (super eksperimental)", "+ Try making the text editable (super experimental)")}</span>
                <br />
                <span className="text-xs text-navy/50">
                  {L("AI coba pisahkan teks jadi elemen yang bisa digeser — belum ada jaminan hasil rapi, bisa saja meleset posisinya. Kena +1 token LAGI (di luar token Desain Lengkap).", "AI tries to separate the text into a draggable element — no guarantee of a clean result, position may be off. Costs +1 MORE token (on top of the Full Design token).")}
                </span>
              </span>
            </label>
          ) : null}
          </>
        ) : null}
        <Button type="button" variant="cta" onClick={() => handleGenerate()} disabled={isGenerating} className="w-fit">
          {isGenerating
            ? (jenis === "berita" ? L("Mencari berita & membuat konten...", "Searching news & generating...") : L("Sedang membuat...", "Generating..."))
            : (jenis === "berita" ? L("🗞️ Cari Berita & Generate", "🗞️ Find News & Generate") : L("Generate Otomatis", "Auto Generate"))}
        </Button>
        <span className="text-xs text-navy/50">{L("Setiap klik Generate memakai 1 token.", "Each Generate uses 1 token.")}</span>
      </div>

      {generateError ? <p className="text-sm text-red-600">{generateError}</p> : null}
      </>
      ) : null}

      {isGenerating ? (
        <GenerateLoadingOverlay onCancel={() => setGenerateStatus("idle")} />
      ) : null}

      {titlesLoading ? (
        <GenerateLoadingOverlay onCancel={() => { generatingRef.current = false; setTitlesLoading(false); }} />
      ) : null}

      {/* Popup "5 pilihan judul" — khusus jenis Dari Foto (produk). User pilih
          satu, baru AI lanjut generate gambar+caption dari judul itu. */}
      {titleChoices ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTitleChoices(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-navy">{L("Pilih judul dulu", "Pick a headline first")}</h3>
            <p className="mb-4 text-sm text-navy/60">
              {L("AI akan buat gambar & caption berdasarkan judul yang kamu pilih.", "AI will generate the image & caption based on the headline you choose.")}
            </p>
            <div className="flex flex-col gap-2.5">
              {titleChoices.titles.map((t, i) => (
                <button key={i} type="button" onClick={() => handlePickTitle(t)}
                  className="rounded-xl border border-line px-4 py-3 text-left text-sm font-medium text-navy transition hover:border-primary hover:bg-primary/5">
                  {t}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setTitleChoices(null)}
              className="mt-4 text-sm text-navy/50 hover:text-navy">{L("Batal", "Cancel")}</button>
          </div>
        </div>
      ) : null}

      {result && editTemplate ? (
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface/50 p-5">
          <p className="text-sm font-medium text-navy">
            {L("Atur posisi teks, logo, dan sosmed langsung di gambar, lalu Simpan Gambar.", "Position the text, logo, and socials right on the image, then Save Image.")}
          </p>

          <div className="mx-auto">
            {domMode ? (
              <div>
                <button type="button" onClick={() => setDomMode(false)}
                  className="mb-2 self-start rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  ● Editor DOM — AKTIF (klik utk editor lama)
                </button>
                <DomEditor
                  key={result.id} /* remount per hasil: riwayat undo tidak bocor antar konten */
                  layout={editTemplate.layouts[result.ratio]}
                  values={editValues}
                  overrides={editorOverrides}
                  onOverridesChange={setEditorOverrides}
                  onTextChange={(slotId, value) => setEditValues((v) => ({ ...v, [slotId]: value }))}
                  photo={editValues.photo ?? null}
                  logoUrl={activeLogo?.url ?? null}
                  socials={footerOverride?.socials ?? []}
                  businessName={businessProfile?.business.name}
                  logoVariant={activeLogoVariant}
                  canToggleLogo={!!(logoDark && logoLight)}
                  onLogoVariantChange={(v) => setEditorOverrides((o) => ({ ...o, logoVariant: v }))}
                  exportRef={domRef}
                />
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => setDomMode(true)}
                  className="mb-2 self-start rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary">
                  ○ Kembali ke Editor DOM
                </button>
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
            )}
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

      <ReferenceTermsModal
        open={showReferenceModal}
        onCancel={() => setShowReferenceModal(false)}
        onConfirm={() => {
          setShowReferenceModal(false);
          const pendingRatio = pendingRatioRef.current;
          pendingRatioRef.current = undefined;
          // Trigger ulang generate — sekarang hasAcceptedReferenceTerms() akan true
          void handleGenerate(pendingRatio);
        }}
      />
    </Card>
  );
}
