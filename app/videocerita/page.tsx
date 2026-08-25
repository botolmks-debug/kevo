"use client";

/**
 * /videocerita — fitur umum (semua user login, tidak lagi admin-only).
 * "Video Cerita Produk": 5 slide (reuse pipeline Carousel: 4 foto AI + 1 foto
 * user) + narasi ElevenLabs per slide, digabung jadi 1 video pendek dengan
 * fade in/out per slide — animasi dari gambar statis, BUKAN AI-video
 * generatif (Veo/Seedance).
 *
 * Alur: pilih foto produk (jadi slide penutup) -> Bikin Storyboard (teks 5
 * slide + naskah narasi + 4 foto AI) -> review/edit naskah -> Buat Suara
 * (ElevenLabs, 1 token/segmen) -> Gabung Jadi Video (render PNG via
 * /api/render + ffmpeg.wasm concat+fade di browser) -> unduh mp4.
 */
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createCarouselTemplate } from "@/lib/templates/carousel";
import { createCeritaTextOverlayTemplate } from "@/lib/templates/ceritaTextOverlay";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; usage: string; publicUrl: string };
type Slide = { title: string; desc: string };
type LogoCorner = "top-right" | "bottom-right";
type SocialsDirection = "row" | "column";
const SLIDE_COUNT = 5;
// Rasio video Reels/TikTok (potret penuh) — revisi: sebelumnya 4:5 (rasio
// feed foto), disesuaikan ke 9:16 supaya pas full-screen di Reels.
const RATIO: AspectRatio = "9:16";
const CANVAS_W = 1080;
const CANVAS_H = 1920;
// Durasi minimum tiap slide (detik) — kalau audio segmen lebih pendek dari
// ini, slide tetap tampil selama ini biar tidak kelewat cepat dibaca.
// Dinaikkan dari 2.2 -> 3.0 (revisi: terasa terburu-buru).
const MIN_SLIDE_SECONDS = 3.0;
// Jeda diam (detik) ditambahkan SETELAH narasi selesai, sebelum potong ke
// slide berikutnya — kasih waktu "napas" biar transisi tidak terasa buru-buru.
const TAIL_HOLD_SECONDS = 0.5;
// Margin dari tepi kanvas buat logo pojok (revisi: logo custom, lepas dari
// posisi/skala umum di Pengaturan Logo Bisnis).
const LOGO_MARGIN = 40;

/** Muat gambar jadi HTMLImageElement (data: URI atau URL remote). */
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
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 5000);
  }
}

/** Durasi audio (detik) dari data URI mp3, via elemen <audio> sementara. */
function audioDuration(dataUri: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.src = dataUri;
    a.addEventListener("loadedmetadata", () => resolve(Number.isFinite(a.duration) ? a.duration : MIN_SLIDE_SECONDS));
    a.addEventListener("error", () => resolve(MIN_SLIDE_SECONDS));
  });
}

export default function VideoCeritaPage() {
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selected, setSelected] = useState<PickableImage | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [logoCorner, setLogoCorner] = useState<LogoCorner>("bottom-right");
  const [socialsDirection, setSocialsDirection] = useState<SocialsDirection>("row");

  const [voices, setVoices] = useState<{ voiceId: string; name: string; previewUrl?: string }[]>([]);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const [sbStatus, setSbStatus] = useState<Status>("idle");
  const [sbError, setSbError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [aiBackgrounds, setAiBackgrounds] = useState<string[]>([]); // slide 1 s/d SLIDE_COUNT-1
  const [lastSlideImage, setLastSlideImage] = useState<string | null>(null); // hasil edit foto asli (slide terakhir), null = fallback ke foto asli
  const [caption, setCaption] = useState<string>(""); // caption otomatis dari storyboard, ditampilkan di step Hasil
  const [captionCopied, setCaptionCopied] = useState(false);

  const [ttsStatus, setTtsStatus] = useState<Status>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [audioDataUris, setAudioDataUris] = useState<string[]>([]);

  const [assembleStatus, setAssembleStatus] = useState<Status>("idle");
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [assembleStep, setAssembleStep] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/images").then((r) => r.json()).then((d) => setImages(d.images ?? [])).catch(() => {});
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((d) => setBusinessProfile((d?.profile ?? d) as BusinessProfile))
      .catch(() => {});
    fetch("/api/video/cerita/voices")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.voices) && d.voices.length > 0) {
          setVoices(d.voices);
          setSelectedVoiceId((prev) => prev || d.voices[0].voiceId);
        } else if (d?.error) {
          setVoicesError(d.error);
        }
      })
      .catch(() => setVoicesError("Gagal memuat daftar suara. Pakai suara default."));
  }, []);

  async function handleStoryboard() {
    if (!selected) return;
    setSbStatus("loading");
    setSbError(null);
    setSlides(null);
    setSegments([]);
    setAiBackgrounds([]);
    setLastSlideImage(null);
    setCaption("");
    setAudioDataUris([]);
    setVideoUrl(null);
    try {
      const res = await fetch("/api/video/cerita/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: selected.id,
          imageDescription: imageDescription || selected.description,
          language: "id",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal bikin storyboard.");
      setSlides(data.slides);
      setSegments(data.segments);
      setAiBackgrounds(data.imageDataUris);
      setLastSlideImage(typeof data.lastSlideImageDataUri === "string" ? data.lastSlideImageDataUri : null);
      setCaption(typeof data.caption === "string" ? data.caption : "");
      setSbStatus("success");
    } catch (e) {
      setSbStatus("error");
      setSbError(e instanceof Error ? e.message : "Gagal bikin storyboard.");
    }
  }

  async function handleTts() {
    if (segments.length !== SLIDE_COUNT) return;
    setTtsStatus("loading");
    setTtsError(null);
    try {
      const res = await fetch("/api/video/cerita/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments, voiceId: selectedVoiceId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal buat suara.");
      const uris = (data.audios as { audioBase64: string; mimeType: string }[]).map(
        (a) => `data:${a.mimeType};base64,${a.audioBase64}`,
      );
      setAudioDataUris(uris);
      setTtsStatus("success");
    } catch (e) {
      setTtsStatus("error");
      setTtsError(e instanceof Error ? e.message : "Gagal buat suara.");
    }
  }

  const ffmpegRef = useRef<{
    writeFile: (n: string, d: Uint8Array) => Promise<void>;
    exec: (a: string[]) => Promise<number>;
    readFile: (n: string) => Promise<Uint8Array | string>;
  } | null>(null);

  async function loadFfmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    // File ffmpeg di-hosting SENDIRI di public/ffmpeg/ (bukan unpkg.com lagi) —
    // menghindari ketergantungan ke CDN luar yang kadang diblokir ekstensi
    // browser/jaringan tertentu (root cause bug "worker tidak merespons").
    // Karena sekarang 1 domain (same-origin), tidak perlu trik blob URL lagi —
    // Worker bisa langsung dibuat dari path biasa.
    console.log("[ffmpeg] mulai import modul ffmpeg (self-hosted)...");
    const mod = (await import(
      /* webpackIgnore: true */ "/ffmpeg/lib/index.js"
    )) as { FFmpeg: new () => {
      load: (o: { coreURL: string; wasmURL: string; classWorkerURL?: string }) => Promise<void>;
      writeFile: (n: string, d: Uint8Array) => Promise<void>;
      exec: (a: string[]) => Promise<number>;
      readFile: (n: string) => Promise<Uint8Array | string>;
    } };
    console.log("[ffmpeg] modul di-import, memanggil ffmpeg.load()...");
    const ffmpeg = new mod.FFmpeg();
    // ffmpeg.load() kadang macet TANPA error (worker gagal kirim sinyal siap).
    // Timeout 25 dtk supaya user dapat pesan jelas, bukan nunggu selamanya.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("ffmpeg.load() timeout 25 detik — worker tidak merespons.")), 25000),
    );
    await Promise.race([
      ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
        classWorkerURL: "/ffmpeg/lib/worker.js",
      }),
      timeout,
    ]);
    console.log("[ffmpeg] ffmpeg.load() SELESAI, siap dipakai.");
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }

  type SlidePng = { bg: Blob; titleText: Blob; descText: Blob };

  /**
   * Override logo (custom half-size + pojok pilihan, lepas dari Pengaturan
   * Logo Bisnis umum) dan arah sosmed footer (row/column) khusus fitur ini,
   * TANPA menyentuh withLogoOverride/withFooterOverride yang dipakai fitur
   * lain (Carousel biasa, dll).
   */
  function applyCeritaLayoutOverrides<T extends { layouts: Record<string, unknown> }>(
    tmpl: T,
    ratio: AspectRatio,
  ): T {
    type LayoutShape = {
      canvas: { width: number; height: number };
      logo: { x: number; y: number; size: number };
      footerLayout: { direction: "row" | "column"; align?: string; y: number; [k: string]: unknown };
      [k: string]: unknown;
    };
    const layout = (tmpl.layouts as Record<AspectRatio, LayoutShape>)[ratio];
    if (!layout) return tmpl;
    const halfSize = Math.max(24, Math.round(layout.logo.size / 2));
    const logoOverride =
      logoCorner === "top-right"
        ? { x: layout.canvas.width - LOGO_MARGIN - halfSize, y: LOGO_MARGIN, size: halfSize }
        : { x: layout.canvas.width - LOGO_MARGIN - halfSize, y: layout.canvas.height - LOGO_MARGIN - halfSize, size: halfSize };

    const socialsCount = 3; // batas maksimal MAX_SELECTED_SOCIALS — cukup buat estimasi jarak, dipotong array asli tetap dipakai saat render
    const footerLayoutOverride =
      socialsDirection === "column"
        ? { ...layout.footerLayout, direction: "column" as const, align: "flex-start" as const, y: layout.footerLayout.y - (socialsCount - 1) * 64 }
        : { ...layout.footerLayout, direction: "row" as const };

    return {
      ...tmpl,
      layouts: {
        ...tmpl.layouts,
        [ratio]: { ...layout, logo: logoOverride, footerLayout: footerLayoutOverride },
      },
    };
  }

  /**
   * Render 1 slide jadi 3 PNG TERPISAH:
   * - bg: foto + logo + footer, TANPA judul/desc, TANPA kotak gelap apa pun
   *   (revisi: kotak solid diganti drop-shadow di teksnya sendiri — lihat
   *   lib/templates/ceritaTextOverlay.ts)
   * - titleText / descText: PNG transparan cuma berisi judul / deskripsi,
   *   sudah termasuk shadow+outline supaya kebaca tanpa perlu latar solid
   * Dipisah (bukan 1 PNG gabungan) supaya judul & desc bisa dianimasikan
   * (slide-up + fade-in) sendiri-sendiri di ffmpeg, tanpa foto ikut
   * bergerak/flash — lihat handleAssemble.
   */
  async function renderSlidePng(photoDataUri: string, slide: Slide): Promise<SlidePng> {
    const socials = businessProfile?.socials?.entries?.length
      ? { businessName: businessProfile.business.name, socials: buildFooterSocials(businessProfile) }
      : null;
    const baseTemplate = createCarouselTemplate();
    const withFooter = socials?.socials?.length
      ? withFooterOverride(baseTemplate, socials.businessName, socials.socials)
      : baseTemplate;
    // Pakai "Logo Gelap" (businessProfile.logo) dulu — lebih kontras di foto
    // yang cenderung terang/hangat pada fitur ini; fallback ke "Logo Terang"
    // (logoLight) kalau logo gelap belum di-upload.
    const logo = businessProfile?.logo ?? businessProfile?.logoLight ?? null;
    const withLogo = withLogoOverride(withFooter, logo);
    const tmpl = applyCeritaLayoutOverrides(withLogo, RATIO);

    async function renderPng(tmplToUse: typeof tmpl, values: Record<string, string>): Promise<Blob> {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(tmplToUse, values, RATIO)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Gagal render slide.");
      }
      return res.blob();
    }

    const textTmpl = createCeritaTextOverlayTemplate();
    const [bg, titleText, descText] = await Promise.all([
      renderPng(tmpl, { photo: photoDataUri, title: "", "desc-0": "" }),
      renderPng(textTmpl, { title: slide.title, "desc-0": "" }),
      renderPng(textTmpl, { title: "", "desc-0": slide.desc }),
    ]);

    return { bg, titleText, descText };
  }

  async function handleAssemble() {
    if (!slides || !selected || audioDataUris.length !== SLIDE_COUNT) return;
    setAssembleStatus("loading");
    setAssembleError(null);
    setVideoUrl(null);
    try {
      // ── 1) Render semua slide (foto AI + 1 foto user/edited) ────────────
      setAssembleStep(`Merender ${SLIDE_COUNT} slide...`);
      const photos = Array.from({ length: SLIDE_COUNT }, (_, i) =>
        i < SLIDE_COUNT - 1 ? aiBackgrounds[i] : (lastSlideImage ?? selected.publicUrl),
      );
      const pngBlobs: SlidePng[] = [];
      for (let i = 0; i < SLIDE_COUNT; i++) {
        pngBlobs.push(await renderSlidePng(photos[i], slides[i]));
      }

      // ── 2) Durasi tiap slide dari panjang audio-nya ─────────────────────
      const durations = await Promise.all(audioDataUris.map((u) => audioDuration(u)));
      const safeDurations = durations.map((d) => Math.max(d, MIN_SLIDE_SECONDS));

      // ── 3) ffmpeg.wasm: tiap slide = klip pendek (foto diam + fade + audio),
      //      lalu semua klip disambung jadi 1 video ────────────────────────
      setAssembleStep("Menyiapkan ffmpeg...");
      const ffmpeg = await loadFfmpeg();

      const clipNames: string[] = [];
      for (let i = 0; i < SLIDE_COUNT; i++) {
        setAssembleStep(`Membuat klip slide ${i + 1}/${SLIDE_COUNT}...`);
        // + TAIL_HOLD: layar tetap diam sejenak SETELAH narasi selesai,
        // sebelum potong ke slide berikutnya (revisi: kesan terburu-buru).
        const dur = safeDurations[i] + TAIL_HOLD_SECONDS;
        const fade = Math.min(0.6, dur / 4);
        // Animasi teks: judul slide-up+fade-in duluan, deskripsi menyusul
        // setelahnya (kinetic typography, diperlambat dikit dari versi
        // sebelumnya) — foto & logo tetap diam karena ada di layer PNG
        // terpisah (bg), tidak ikut animasi ini.
        const titleFade = Math.min(0.55, dur / 5);
        const descDelay = Math.min(0.28, dur / 7);
        const descFade = Math.min(0.5, Math.max(0.15, dur - descDelay) / 5);
        const slideDist = 24; // px, jarak geser naik

        await ffmpeg.writeFile(`bg${i}.png`, new Uint8Array(await pngBlobs[i].bg.arrayBuffer()));
        await ffmpeg.writeFile(`ttl${i}.png`, new Uint8Array(await pngBlobs[i].titleText.arrayBuffer()));
        await ffmpeg.writeFile(`dsc${i}.png`, new Uint8Array(await pngBlobs[i].descText.arrayBuffer()));
        const audioRes = await fetch(audioDataUris[i]);
        await ffmpeg.writeFile(`aud${i}.mp3`, new Uint8Array(await audioRes.arrayBuffer()));
        const clipName = `clip${i}.mp4`;

        const filter =
          `[0:v]scale=${CANVAS_W}:${CANVAS_H}[bg];` +
          `[1:v]scale=${CANVAS_W}:${CANVAS_H},format=rgba,fade=t=in:st=0:d=${titleFade}:alpha=1[ttl];` +
          `[2:v]scale=${CANVAS_W}:${CANVAS_H},format=rgba,fade=t=in:st=${descDelay}:d=${descFade}:alpha=1[dsc];` +
          `[bg][ttl]overlay=x=0:y='${slideDist}*(1-min(t/${titleFade},1))':eval=frame[bg1];` +
          `[bg1][dsc]overlay=x=0:y='${slideDist}*(1-min(max(t-${descDelay},0)/${descFade},1))':eval=frame,` +
          `fade=t=in:st=0:d=${fade}:color=black,fade=t=out:st=${Math.max(0, dur - fade)}:d=${fade}:color=black[v]`;

        // TANPA "-shortest": video (loop foto) sengaja dibiarkan lanjut
        // sampai "-t dur" walau audio sudah selesai duluan — itu yang
        // menciptakan jeda diam (TAIL_HOLD) sebelum potong ke slide
        // berikutnya.
        const code = await ffmpeg.exec([
          "-loop", "1", "-i", `bg${i}.png`,
          "-loop", "1", "-i", `ttl${i}.png`,
          "-loop", "1", "-i", `dsc${i}.png`,
          "-i", `aud${i}.mp3`,
          "-t", String(dur),
          "-filter_complex", filter,
          "-map", "[v]", "-map", "3:a",
          "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          clipName,
        ]);
        if (code !== 0) throw new Error(`Gagal membuat klip slide ${i + 1}.`);
        clipNames.push(clipName);
      }

      // ── 4) Sambung semua klip jadi 1 video ───────────────────────────────
      setAssembleStep("Menggabungkan semua slide...");
      const listContent = clipNames.map((n) => `file '${n}'`).join("\n");
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listContent));
      const concatCode = await ffmpeg.exec([
        "-f", "concat", "-safe", "0", "-i", "list.txt",
        "-c", "copy",
        "out.mp4",
      ]);
      if (concatCode !== 0) throw new Error("Gagal menggabungkan slide jadi video.");

      const out = await ffmpeg.readFile("out.mp4");
      if (typeof out === "string") throw new Error("Output video tidak valid.");
      setVideoUrl(URL.createObjectURL(new Blob([out.buffer as ArrayBuffer], { type: "video/mp4" })));
      setAssembleStatus("success");
      setAssembleStep("");
    } catch (e) {
      setAssembleStatus("error");
      setAssembleError(
        e instanceof Error ? `${e.message} (butuh internet ke unpkg.com untuk memuat ffmpeg)` : "Gagal menggabungkan video.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Video Cerita Produk</h1>
          <p className="text-sm text-navy/60 mt-1">
            {SLIDE_COUNT} slide ({SLIDE_COUNT - 1} foto AI + fotomu) dengan narasi suara ElevenLabs, digabung jadi 1 video pendek. Bukan AI-video generatif.
          </p>
        </div>

        {/* ── Pengaturan tampilan (logo & sosmed) ─────────────────────────── */}
        <Card>
          <h2 className="font-semibold text-navy mb-3">Pengaturan tampilan</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-navy mb-1.5">Posisi logo</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLogoCorner("top-right")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${logoCorner === "top-right" ? "bg-primary text-white border-primary" : "border-line text-navy/70"}`}
                >
                  Kanan atas
                </button>
                <button
                  type="button"
                  onClick={() => setLogoCorner("bottom-right")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${logoCorner === "bottom-right" ? "bg-primary text-white border-primary" : "border-line text-navy/70"}`}
                >
                  Kanan bawah
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-navy mb-1.5">Arah ikon sosial media</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSocialsDirection("row")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${socialsDirection === "row" ? "bg-primary text-white border-primary" : "border-line text-navy/70"}`}
                >
                  Mendatar
                </button>
                <button
                  type="button"
                  onClick={() => setSocialsDirection("column")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${socialsDirection === "column" ? "bg-primary text-white border-primary" : "border-line text-navy/70"}`}
                >
                  Menurun
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Step 1: pilih foto produk (jadi slide penutup) ──────────────── */}
        <Card>
          <h2 className="font-semibold text-navy mb-3">1. Pilih foto produk (jadi slide penutup)</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(img)}
                className={`aspect-square rounded-lg overflow-hidden border-2 ${selected?.id === img.id ? "border-primary" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.publicUrl} alt={img.description} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {images.length === 0 ? <p className="text-xs text-navy/50 mt-2">Belum ada foto — upload dulu di halaman Upload Gambar.</p> : null}
          <Button type="button" className="mt-4" disabled={!selected || sbStatus === "loading"} onClick={handleStoryboard}>
            {sbStatus === "loading" ? "Membuat storyboard..." : "2. Bikin Storyboard (6 token)"}
          </Button>
          {sbError ? <p className="text-sm text-red-600 mt-2">{sbError}</p> : null}
        </Card>

        {/* ── Step 2: review slide + naskah narasi ───────────────────────── */}
        {slides ? (
          <Card>
            <h2 className="font-semibold text-navy mb-3">3. Review naskah narasi (bisa diedit)</h2>
            <div className="flex flex-col gap-4">
              {slides.map((s, i) => (
                <div key={i} className="rounded-xl border border-line p-3 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={i < SLIDE_COUNT - 1 ? aiBackgrounds[i] : (lastSlideImage ?? selected?.publicUrl)}
                    alt=""
                    className="w-16 h-20 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-primary">Slide {i + 1} — {s.title}</p>
                    <p className="text-xs text-navy/50">{s.desc}</p>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                      rows={2}
                      value={segments[i] ?? ""}
                      onChange={(e) => setSegments((prev) => prev.map((seg, idx) => (idx === i ? e.target.value : seg)))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-navy" htmlFor="voice-picker">Pilih suara narator</label>
              {voices.length > 0 ? (
                <select
                  id="voice-picker"
                  className="rounded-lg border border-line px-2 py-1.5 text-sm"
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                >
                  {voices.map((v) => (
                    <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-navy/50">
                  {voicesError ?? "Memuat daftar suara..."}
                  {voicesError ? " Pakai suara default sementara — untuk pilih suara, aktifkan scope \"Voices: Read\" di API key ElevenLabs kamu." : ""}
                </p>
              )}
              {selectedVoiceId && voices.find((v) => v.voiceId === selectedVoiceId)?.previewUrl ? (
                <audio src={voices.find((v) => v.voiceId === selectedVoiceId)?.previewUrl} controls className="h-8 mt-1" />
              ) : null}
            </div>

            <Button type="button" className="mt-4" disabled={ttsStatus === "loading"} onClick={handleTts}>
              {ttsStatus === "loading" ? "Membuat suara..." : `4. Buat Suara — ElevenLabs (${segments.length || SLIDE_COUNT} token)`}
            </Button>
            {ttsError ? <p className="text-sm text-red-600 mt-2">{ttsError}</p> : null}
          </Card>
        ) : null}

        {/* ── Step 3: preview audio + gabung jadi video ──────────────────── */}
        {audioDataUris.length === SLIDE_COUNT ? (
          <Card>
            <h2 className="font-semibold text-navy mb-3">5. Dengar preview suara</h2>
            <div className="flex flex-col gap-2">
              {audioDataUris.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-navy/50 w-16 shrink-0">Slide {i + 1}</span>
                  <audio src={u} controls className="h-8 flex-1" />
                </div>
              ))}
            </div>
            <Button type="button" className="mt-4" disabled={assembleStatus === "loading"} onClick={handleAssemble}>
              {assembleStatus === "loading" ? (assembleStep || "Memproses...") : "6. Gabung Jadi Video"}
            </Button>
            {assembleError ? <p className="text-sm text-red-600 mt-2">{assembleError}</p> : null}
          </Card>
        ) : null}

        {/* ── Hasil ───────────────────────────────────────────────────────── */}
        {videoUrl ? (
          <Card>
            <h2 className="font-semibold text-navy mb-3">Hasil</h2>
            <video src={videoUrl} controls className="w-full max-w-xs mx-auto rounded-xl" />
            <a
              href={videoUrl}
              download="keposting-video-cerita.mp4"
              className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Unduh Video
            </a>

            {caption ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-navy mb-1.5">Caption (otomatis, bisa diedit sebelum posting)</p>
                <textarea
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <Button
                  type="button"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(caption);
                      setCaptionCopied(true);
                      setTimeout(() => setCaptionCopied(false), 2000);
                    } catch {
                      // best-effort — clipboard bisa gagal (mis. izin browser), biarkan user copy manual
                    }
                  }}
                >
                  {captionCopied ? "Tersalin!" : "Salin caption"}
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}
      </main>
    </div>
  );
}
