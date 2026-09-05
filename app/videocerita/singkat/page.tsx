"use client";

/**
 * /videocerita/singkat — "Ringkas 15 Detik": ubah 1 GAMBAR KONTEN YANG SUDAH
 * ADA (dari Riwayat) jadi video pendek 15 detik, BEDA dari /videocerita
 * (Cerita Produk) yang generate 5 gambar AI baru dari nol. Di sini gambarnya
 * dipakai APA ADANYA (sudah final, ada logo/footer/teks bawaan) — yang
 * ditambahkan cuma: naskah VO (hook+ringkasan dari caption, ElevenLabs),
 * 1 baris teks hook fade-in di atas, dan musik latar pilihan (opsional,
 * volume diturunkan supaya VO tetap dominan).
 *
 * Alur: pilih konten dari Riwayat -> Buat Naskah (1 token, AI ringkas
 * caption jadi VO hook) -> edit naskah kalau perlu -> pilih suara + musik ->
 * Buat Suara (ElevenLabs, gratis-termasuk) -> Gabung Jadi Video (ffmpeg.wasm
 * di browser) -> unduh / simpan ke Riwayat.
 */
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MUSIC_LIBRARY, getMusicTrack } from "@/lib/video/musicLibrary";

type Status = "idle" | "loading" | "success" | "error";
type PickableContent = { id: string; jenis: string; imageUrl: string; caption: string; status: string };

// Jeda diam (detik) ditambahkan SETELAH VO selesai, sebelum video berhenti —
// kasih waktu "napas" di akhir CTA, sama pola-nya dengan TAIL_HOLD di Cerita
// Produk. Durasi video kini ikut panjang VO (bukan dipotong 15 detik tetap)
// supaya naskah/CTA tidak pernah kepotong — lihat handleAssemble.
const TAIL_HOLD_SECONDS = 0.6;
// Volume musik relatif thd VO (VO tetap 1.0) — diminta "lebih rendah dari VO".
const MUSIC_VOLUME = 0.18;
const CANVAS_W = 1080;
const CANVAS_H = 1920;

/** Durasi audio (detik) dari data URI mp3, via elemen <audio> sementara. */
function audioDuration(dataUri: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.src = dataUri;
    a.addEventListener("loadedmetadata", () => resolve(Number.isFinite(a.duration) ? a.duration : 15));
    a.addEventListener("error", () => resolve(15));
  });
}

async function fetchAsBytes(url: string): Promise<{ bytes: Uint8Array; ext: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat gambar konten.");
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext };
}

function dataUriToBytes(dataUri: string): Uint8Array {
  const base64 = dataUri.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default function VideoCeritaSingkatPage() {
  const [items, setItems] = useState<PickableContent[]>([]);
  const [selected, setSelected] = useState<PickableContent | null>(null);

  const [voices, setVoices] = useState<{ voiceId: string; name: string; previewUrl?: string }[]>([]);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [selectedMusicId, setSelectedMusicId] = useState<string>(MUSIC_LIBRARY[1]?.id ?? "none");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [musicPreviewPlaying, setMusicPreviewPlaying] = useState(false);
  const [musicPreviewError, setMusicPreviewError] = useState<string | null>(null);
  const musicPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [naskahStatus, setNaskahStatus] = useState<Status>("idle");
  const [naskahError, setNaskahError] = useState<string | null>(null);
  const [script, setScript] = useState("");

  const [ttsStatus, setTtsStatus] = useState<Status>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);

  const [assembleStatus, setAssembleStatus] = useState<Status>("idle");
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [assembleStep, setAssembleStep] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [saveHistoryStatus, setSaveHistoryStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const ffmpegRef = useRef<{
    writeFile: (name: string, data: Uint8Array) => Promise<void>;
    readFile: (name: string) => Promise<Uint8Array | string>;
    exec: (args: string[]) => Promise<number>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/generate-auto")
      .then((r) => r.json())
      .then((d) => {
        const rows = Array.isArray(d?.items) ? d.items : [];
        setItems(rows.filter((it: PickableContent) => it.jenis !== "video_cerita"));
      })
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

  function pickContent(item: PickableContent) {
    setSelected(item);
    setScript("");
    setAudioDataUri(null);
    setVideoUrl(null);
    setNaskahStatus("idle");
    setTtsStatus("idle");
    setAssembleStatus("idle");
    setSaveHistoryStatus("idle");
  }

  const currentVoicePreviewUrl = voices.find((v) => v.voiceId === selectedVoiceId)?.previewUrl;

  function handlePreviewVoice() {
    if (!currentVoicePreviewUrl) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewPlaying(false);
      return;
    }
    const audio = new Audio(currentVoicePreviewUrl);
    previewAudioRef.current = audio;
    setPreviewPlaying(true);
    audio.addEventListener("ended", () => { previewAudioRef.current = null; setPreviewPlaying(false); });
    audio.addEventListener("error", () => { previewAudioRef.current = null; setPreviewPlaying(false); });
    audio.play().catch(() => { previewAudioRef.current = null; setPreviewPlaying(false); });
  }

  function handlePreviewMusic() {
    const track = getMusicTrack(selectedMusicId);
    if (!track?.file) return;
    setMusicPreviewError(null);
    if (musicPreviewRef.current) {
      musicPreviewRef.current.pause();
      musicPreviewRef.current = null;
      setMusicPreviewPlaying(false);
      return;
    }
    const audio = new Audio(track.file);
    musicPreviewRef.current = audio;
    setMusicPreviewPlaying(true);
    audio.addEventListener("ended", () => { musicPreviewRef.current = null; setMusicPreviewPlaying(false); });
    audio.addEventListener("error", () => {
      musicPreviewRef.current = null;
      setMusicPreviewPlaying(false);
      setMusicPreviewError(`File "${track.file}" belum ada di public/. Lihat catatan di lib/video/musicLibrary.ts.`);
    });
    audio.play().catch(() => { musicPreviewRef.current = null; setMusicPreviewPlaying(false); });
  }

  async function handleBuatNaskah() {
    if (!selected) return;
    setNaskahStatus("loading");
    setNaskahError(null);
    try {
      const res = await fetch("/api/video/cerita/singkat/naskah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: selected.caption, jenis: selected.jenis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal membuat naskah.");
      setScript(data.script);
      setNaskahStatus("success");
    } catch (e) {
      setNaskahStatus("error");
      setNaskahError(e instanceof Error ? e.message : "Gagal membuat naskah.");
    }
  }

  async function handleBuatSuara() {
    if (!script.trim()) return;
    setTtsStatus("loading");
    setTtsError(null);
    setAudioDataUri(null);
    setVideoUrl(null);
    try {
      const res = await fetch("/api/video/cerita/singkat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script.trim(), voiceId: selectedVoiceId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal membuat suara.");
      setAudioDataUri(`data:${data.mimeType};base64,${data.audioBase64}`);
      setTtsStatus("success");
    } catch (e) {
      setTtsStatus("error");
      setTtsError(e instanceof Error ? e.message : "Gagal membuat suara.");
    }
  }

  async function loadFfmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    const mod = await import(
      /* webpackIgnore: true */ "/ffmpeg/lib/index.js"
    );
    const ffmpeg = new mod.FFmpeg();
    await Promise.race([
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ffmpeg.load() timeout 25 detik — worker tidak merespons.")), 25000),
      ),
      ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
        classWorkerURL: "/ffmpeg/lib/worker.js",
      }),
    ]);
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }

  async function handleAssemble() {
    if (!selected || !audioDataUri) return;
    setAssembleStatus("loading");
    setAssembleError(null);
    setVideoUrl(null);
    try {
      // ── 1) Gambar konten asli (dipakai APA ADANYA, tidak di-render ulang —
      //      sudah ada teks/logo/footer bawaan, TIDAK ditimpa teks lain lagi
      //      supaya tidak numpuk/tabrakan) ────────────────────────────────
      setAssembleStep("Menyiapkan gambar...");
      const { bytes: bgBytes, ext: bgExt } = await fetchAsBytes(selected.imageUrl);

      // ── 2) Durasi video ikut panjang VO + jeda napas di akhir (BUKAN
      //      dipotong 15 detik tetap) — supaya naskah/CTA tidak kepotong ──
      setAssembleStep("Mengukur durasi suara...");
      const voSeconds = await audioDuration(audioDataUri);
      const clipSeconds = voSeconds + TAIL_HOLD_SECONDS;

      // ── 3) Musik latar (opsional) ─────────────────────────────────────────
      const track = getMusicTrack(selectedMusicId);
      const hasMusic = !!track && track.file;
      let musicBytes: Uint8Array | null = null;
      if (hasMusic) {
        setAssembleStep("Menyiapkan musik...");
        try {
          const musicRes = await fetch(track!.file, { cache: "no-store" });
          if (!musicRes.ok) throw new Error("File musik tidak ditemukan di server.");
          musicBytes = new Uint8Array(await musicRes.arrayBuffer());
        } catch {
          throw new Error(
            `File musik "${track!.file}" belum ada di public/. Pilih "Tanpa musik" atau minta developer upload file musiknya dulu.`,
          );
        }
      }

      // ── 4) ffmpeg.wasm: gabung jadi 1 klip (durasi = VO + jeda) ─────────────
      setAssembleStep("Menyiapkan ffmpeg...");
      const ffmpeg = await loadFfmpeg();

      await ffmpeg.writeFile(`bg.${bgExt}`, bgBytes);
      await ffmpeg.writeFile("vo.mp3", dataUriToBytes(audioDataUri));
      if (musicBytes) await ffmpeg.writeFile("music.mp3", musicBytes);

      setAssembleStep("Menggabungkan video...");
      const args = [
        "-loop", "1", "-i", `bg.${bgExt}`,
        "-i", "vo.mp3",
        ...(musicBytes ? ["-stream_loop", "-1", "-i", "music.mp3"] : []),
        "-t", String(clipSeconds),
      ];

      const videoFilter = `[0:v]scale=${CANVAS_W}:${CANVAS_H}[v]`;
      const audioFilter = musicBytes
        ? `;[1:a]volume=1.0[vo];[2:a]volume=${MUSIC_VOLUME}[mu];[vo][mu]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[a]`
        : `;[1:a]volume=1.0[a]`;

      args.push(
        "-filter_complex", videoFilter + audioFilter,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "out.mp4",
      );

      const code = await ffmpeg.exec(args);
      if (code !== 0) throw new Error("Gagal menggabungkan video.");

      const out = await ffmpeg.readFile("out.mp4");
      if (typeof out === "string") throw new Error("Output video tidak valid.");
      setVideoUrl(URL.createObjectURL(new Blob([out.buffer as ArrayBuffer], { type: "video/mp4" })));
      setAssembleStatus("success");
      setAssembleStep("");
    } catch (e) {
      setAssembleStatus("error");
      setAssembleError(e instanceof Error ? e.message : "Gagal menggabungkan video.");
    }
  }

  async function handleSaveHistory() {
    if (!videoUrl || !selected) return;
    setSaveHistoryStatus("saving");
    try {
      const videoBlob = await fetch(videoUrl).then((r) => r.blob());
      const form = new FormData();
      form.append("video", videoBlob, "ringkas.mp4");
      form.append("title", script.slice(0, 200));
      form.append("caption", selected.caption);
      const res = await fetch("/api/video/cerita/save", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      setSaveHistoryStatus("success");
    } catch {
      setSaveHistoryStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Ringkas 15 Detik</h1>
          <p className="text-sm text-navy/60">
            Ubah konten yang sudah ada jadi video pendek — voice over ringkas dari caption + musik latar. Durasi ikut panjang voice over (bukan dipotong 15 detik). Pas buat TikTok & Reels.
          </p>
        </div>

        {/* Step 1 — pilih konten */}
        <Card className="flex flex-col gap-3">
          <h3 className="font-semibold text-navy">1. Pilih Konten</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => pickContent(it)}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  selected?.id === it.id ? "border-primary" : "border-transparent hover:border-line"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
              </button>
            ))}
          </div>
          {items.length === 0 ? <p className="text-sm text-navy/50">Belum ada konten di Riwayat.</p> : null}
        </Card>

        {/* Step 2 — naskah */}
        {selected ? (
          <Card className="flex flex-col gap-3">
            <h3 className="font-semibold text-navy">2. Naskah Voice Over</h3>
            <p className="text-xs text-navy/50 line-clamp-2">Caption asli: {selected.caption}</p>
            <Button type="button" onClick={handleBuatNaskah} disabled={naskahStatus === "loading"} className="w-fit">
              {naskahStatus === "loading" ? "Membuat naskah..." : script ? "Buat Ulang Naskah (1 token)" : "Buat Naskah (1 token)"}
            </Button>
            {naskahError ? <p className="text-sm text-red-600">{naskahError}</p> : null}
            {script ? (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            ) : null}
          </Card>
        ) : null}

        {/* Step 3 — suara + musik */}
        {script ? (
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-navy">3. Suara & Musik</h3>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Suara</span>
              {voicesError ? <p className="text-xs text-red-600">{voicesError}</p> : null}
              <div className="flex items-center gap-2">
                <select
                  value={selectedVoiceId}
                  onChange={(e) => {
                    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; setPreviewPlaying(false); }
                    setSelectedVoiceId(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                >
                  {voices.map((v) => (
                    <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  disabled={!currentVoicePreviewUrl}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary transition hover:bg-primary/5 disabled:opacity-40"
                  title="Dengar contoh suara"
                  aria-label="Dengar contoh suara"
                >
                  {previewPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
              </div>
              {!currentVoicePreviewUrl && voices.length > 0 ? (
                <p className="text-xs text-navy/40">Contoh suara tidak tersedia untuk suara ini.</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Musik latar</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMusicId}
                  onChange={(e) => {
                    if (musicPreviewRef.current) { musicPreviewRef.current.pause(); musicPreviewRef.current = null; setMusicPreviewPlaying(false); }
                    setSelectedMusicId(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                >
                  {MUSIC_LIBRARY.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.mood}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handlePreviewMusic}
                  disabled={!getMusicTrack(selectedMusicId)?.file}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary transition hover:bg-primary/5 disabled:opacity-40"
                  title="Dengar contoh musik"
                  aria-label="Dengar contoh musik"
                >
                  {musicPreviewPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
              </div>
              {musicPreviewError ? <p className="text-xs text-red-600">{musicPreviewError}</p> : null}
            </div>
            <Button type="button" onClick={handleBuatSuara} disabled={ttsStatus === "loading"} className="w-fit">
              {ttsStatus === "loading" ? "Membuat suara..." : "Buat Suara"}
            </Button>
            {ttsError ? <p className="text-sm text-red-600">{ttsError}</p> : null}
          </Card>
        ) : null}

        {/* Step 4 — gabung jadi video */}
        {audioDataUri ? (
          <Card className="flex flex-col gap-3">
            <h3 className="font-semibold text-navy">4. Gabung Jadi Video</h3>
            <Button type="button" onClick={handleAssemble} disabled={assembleStatus === "loading"} className="w-fit">
              {assembleStatus === "loading" ? (assembleStep || "Memproses...") : "Gabung Jadi Video"}
            </Button>
            {assembleError ? <p className="text-sm text-red-600">{assembleError}</p> : null}
            {videoUrl ? (
              <div className="flex flex-col gap-3">
                <video src={videoUrl} controls className="w-full max-w-[280px] rounded-2xl" />
                <div className="flex flex-wrap gap-2">
                  <a href={videoUrl} download="ringkas-15detik.mp4">
                    <Button type="button" variant="secondary">Unduh</Button>
                  </a>
                  <Button type="button" variant="secondary" onClick={handleSaveHistory} disabled={saveHistoryStatus === "saving"}>
                    {saveHistoryStatus === "saving" ? "Menyimpan..." : saveHistoryStatus === "success" ? "Tersimpan ✓" : "Simpan ke Riwayat"}
                  </Button>
                </div>
                {saveHistoryStatus === "error" ? <p className="text-sm text-red-600">Gagal simpan ke riwayat.</p> : null}
              </div>
            ) : null}
          </Card>
        ) : null}
      </main>
    </div>
  );
}
