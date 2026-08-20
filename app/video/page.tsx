"use client";

/**
 * /video — halaman utama menu Video (ADMIN ONLY; proxy.ts redirect /video* utk non-admin).
 * Menggantikan halaman Video Avatar (beta) lama yang tidak dilanjutkan.
 * Alur: pilih foto produk + target market -> OpenAI bikin naskah/storyboard/
 * prompt (murah) -> review/edit -> Generate Veo (BIAYA NYATA ±$1.5-6/klip,
 * 8 detik) -> poll tiap 10 dtk -> tonton & unduh.
 */
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";
type PickableImage = { id: string; description: string; category: string; usage: string; publicUrl: string };
type Storyboard = {
  videoPrompt: string;
  naskah: string;
  adegan: { detik: string; deskripsi: string }[];
  negativePrompt: string;
};

export default function VideoPage() {
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selected, setSelected] = useState<PickableImage | null>(null);
  const [productDesc, setProductDesc] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [aspect, setAspect] = useState<"9:16" | "16:9">("9:16");
  // Provider video: Veo (Gemini, bisa bicara, mahal) vs Seedance Fast (fal.ai, murah).
  const [provider, setProvider] = useState<"veo" | "seedance">("seedance");
  // Durasi video: 8 dtk (dua provider) atau 10 dtk (hanya Seedance).
  const [durVid, setDurVid] = useState<8 | 10>(8);

  const [sb, setSb] = useState<Storyboard | null>(null);
  const [sbStatus, setSbStatus] = useState<Status>("idle");
  const [sbError, setSbError] = useState<string | null>(null);

  const [genStatus, setGenStatus] = useState<Status>("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pasang logo (watermark kanan bawah) — diproses di browser via ffmpeg.wasm.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(150); // lebar px pada video 720p
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoVideoUrl, setLogoVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/images").then((r) => r.json()).then((d) => setImages(d.images ?? [])).catch(() => {});
    // Logo bisnis dari profil (coba beberapa bentuk respons; kalau gagal, admin bisa pilih file manual).
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d?.profile ?? d;
        const url =
          p?.logoLight?.url ?? p?.logo?.url ?? p?.logoLight ?? p?.logo ?? null;
        if (typeof url === "string" && url.startsWith("http")) setLogoUrl(url);
      })
      .catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function pasangLogo() {
    if (!videoUrl || !logoUrl) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      // ffmpeg.wasm single-thread (tanpa SharedArrayBuffer) dari CDN —
      // webpackIgnore supaya Next tidak mencoba mem-bundle URL eksternal.
      const mod = (await import(
        /* webpackIgnore: true */ "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
      )) as { FFmpeg: new () => {
        load: (o: { coreURL: string; wasmURL: string; classWorkerURL?: string }) => Promise<void>;
        writeFile: (n: string, d: Uint8Array) => Promise<void>;
        exec: (a: string[]) => Promise<number>;
        readFile: (n: string) => Promise<Uint8Array | string>;
      } };
      // Browser melarang Worker dimuat lintas-origin (unpkg vs situs kita),
      // jadi semua file ffmpeg diunduh dulu sebagai BLOB lalu dimuat dari
      // blob URL lokal — pola resmi dari dokumentasi ffmpeg.wasm.
      const toBlobURL = async (url: string, type: string) => {
        const buf = await (await fetch(url)).arrayBuffer();
        return URL.createObjectURL(new Blob([buf], { type }));
      };
      const ffmpeg = new mod.FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
          "application/wasm",
        ),
        classWorkerURL: await toBlobURL(
          "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js",
          "text/javascript",
        ),
      });
      const vid = new Uint8Array(await (await fetch(videoUrl)).arrayBuffer());
      const logo = new Uint8Array(await (await fetch(logoUrl)).arrayBuffer());
      await ffmpeg.writeFile("in.mp4", vid);
      await ffmpeg.writeFile("logo.png", logo);
      const code = await ffmpeg.exec([
        "-i", "in.mp4",
        "-i", "logo.png",
        "-filter_complex", `[1]scale=${logoSize}:-1[lg];[0][lg]overlay=W-w-24:H-h-24`,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "copy",
        "out.mp4",
      ]);
      if (code !== 0) throw new Error("Proses ffmpeg gagal.");
      const out = await ffmpeg.readFile("out.mp4");
      if (typeof out === "string") throw new Error("Output tidak valid.");
      setLogoVideoUrl(URL.createObjectURL(new Blob([out.buffer as ArrayBuffer], { type: "video/mp4" })));
    } catch (e) {
      setLogoError(
        e instanceof Error ? `${e.message} (butuh internet ke unpkg.com utk memuat ffmpeg)` : "Gagal memasang logo.",
      );
    } finally {
      setLogoBusy(false);
    }
  }

  function pickImage(img: PickableImage) {
    setSelected(img);
    if (!productDesc.trim() && img.description) setProductDesc(img.description);
  }

  async function handleStoryboard() {
    if (!productDesc.trim() || !targetMarket.trim()) return;
    setSbStatus("loading");
    setSbError(null);
    setSb(null);
    try {
      const res = await fetch("/api/video/veo/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productDescription: productDesc, targetMarket, durationSeconds: durVid }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Gagal.");
      setSb(d);
      setSbStatus("success");
    } catch (e) {
      setSbStatus("error");
      setSbError(e instanceof Error ? e.message : "Gagal membuat storyboard.");
    }
  }

  async function handleGenerate() {
    if (!sb) return;
    setGenStatus("loading");
    setGenError(null);
    setVideoUrl(null);
    setLogoVideoUrl(null);
    setLogoError(null);
    try {
      // Seedance = image-to-video murni: WAJIB ada foto produk.
      if (provider === "seedance" && !selected?.publicUrl) {
        throw new Error("Seedance butuh foto produk — pilih gambar dari galeri di langkah 1.");
      }
      const endpoint =
        provider === "veo" ? "/api/video/veo/generate" : "/api/video/seedance/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: sb.videoPrompt,
          negativePrompt: sb.negativePrompt,
          productImageUrl: selected?.publicUrl,
          aspectRatio: aspect,
          durationSeconds: durVid,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Gagal submit.");
      startPolling(provider, (d.operationName ?? d.requestId) as string);
    } catch (e) {
      setGenStatus("error");
      setGenError(e instanceof Error ? e.message : "Gagal.");
    }
  }

  function startPolling(prov: "veo" | "seedance", op: string) {
    setPolling(true);
    const statusUrl =
      prov === "veo"
        ? `/api/video/veo/status?op=${encodeURIComponent(op)}`
        : `/api/video/seedance/status?id=${encodeURIComponent(op)}`;
    const check = async () => {
      try {
        const res = await fetch(statusUrl);
        const d = await res.json();
        if (d?.error) throw new Error(d.error);
        if (d?.done && d?.ready) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          // Unduh mp4 sebagai blob supaya bisa diputar + disimpan.
          const vid = await fetch(`${statusUrl}&dl=1`);
          if (!vid.ok) throw new Error("Video selesai tapi gagal diunduh — coba refresh.");
          const blob = await vid.blob();
          setVideoUrl(URL.createObjectURL(blob));
          setGenStatus("success");
        }
      } catch (e) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPolling(false);
        setGenStatus("error");
        setGenError(e instanceof Error ? e.message : "Gagal.");
      }
    };
    check();
    pollRef.current = setInterval(check, 10000);
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-navy">Video Produk (AI)</h1>
          <p className="mt-1 text-sm text-navy/60">
            OpenAI menyusun naskah & storyboard, lalu pilih mesin video: Seedance Fast
            (±Rp30-40rb/klip via fal.ai, 8-10 detik) atau Veo (Gemini, ±Rp25-100rb/klip,
            maks 8 detik, butuh paid tier). Biaya nyata per klip.
          </p>
        </div>

        {/* 1. Produk & target */}
        <Card className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy">1. Produk & Target Market</h3>
          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((img) => (
                <button key={img.id} type="button" onClick={() => pickImage(img)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 ${selected?.id === img.id ? "border-primary" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.publicUrl} alt={img.description} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-navy/50">Belum ada gambar di galeri — video tetap bisa dibuat tanpa foto (kurang akurat).</p>
          )}
          <input value={productDesc} onChange={(e) => setProductDesc(e.target.value)}
            placeholder="Deskripsi produk (mis. botol minum 500ml bening, cocok jualan minuman)"
            className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
          <input value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}
            placeholder="Target market (mis. penjual minuman kekinian di Makassar, usia 20-35)"
            className="rounded-xl border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
          <div className="flex gap-2">
            {(["9:16", "16:9"] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAspect(a)}
                className={`rounded-full border px-4 py-1.5 text-sm ${aspect === a ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>
                {a === "9:16" ? "Story/Reels (9:16)" : "Lanskap (16:9)"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-navy/60">Mesin video:</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setProvider("seedance")}
                className={`rounded-xl border px-4 py-2 text-left text-xs ${provider === "seedance" ? "border-primary bg-primary/10" : "border-line"}`}>
                <span className="block font-semibold text-navy">Seedance Fast</span>
                <span className="text-navy/60">±Rp30-40rb/klip · 720p · wajib foto produk</span>
              </button>
              <button type="button" onClick={() => { setProvider("veo"); setDurVid(8); }}
                className={`rounded-xl border px-4 py-2 text-left text-xs ${provider === "veo" ? "border-primary bg-primary/10" : "border-line"}`}>
                <span className="block font-semibold text-navy">Veo (Gemini)</span>
                <span className="text-navy/60">±Rp25-100rb/klip · bicara paling natural</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-navy/60">Durasi (naskah menyesuaikan):</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDurVid(8)}
                className={`rounded-full border px-4 py-1.5 text-sm ${durVid === 8 ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>
                8 detik
              </button>
              <button type="button" onClick={() => setDurVid(10)} disabled={provider === "veo"}
                className={`rounded-full border px-4 py-1.5 text-sm ${durVid === 10 ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"} ${provider === "veo" ? "opacity-40" : ""}`}>
                10 detik (Seedance)
              </button>
            </div>
          </div>
          <Button type="button" variant="cta" onClick={handleStoryboard}
            disabled={sbStatus === "loading" || !productDesc.trim() || !targetMarket.trim()}>
            {sbStatus === "loading" ? "Menyusun storyboard..." : "Buat Naskah & Storyboard (OpenAI)"}
          </Button>
          {sbError ? <p className="text-sm text-red-600">{sbError}</p> : null}
        </Card>

        {/* 2. Review storyboard */}
        {sb ? (
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-navy">2. Review Storyboard</h3>
            <div className="rounded-xl bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold text-navy/60">Naskah yang diucapkan:</p>
              <p className="mt-1 text-sm text-navy">&ldquo;{sb.naskah}&rdquo;</p>
            </div>
            {sb.adegan.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {sb.adegan.map((a, i) => (
                  <p key={i} className="text-xs text-navy/70">
                    <span className="font-semibold text-navy">Detik {a.detik}:</span> {a.deskripsi}
                  </p>
                ))}
              </div>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-navy/60">Prompt video (boleh diedit — kunci realistis otomatis dijaga):</span>
              <textarea value={sb.videoPrompt} rows={6}
                onChange={(e) => setSb({ ...sb, videoPrompt: e.target.value })}
                className="resize-none rounded-xl border border-line px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
            </label>
            <Button type="button" variant="cta" onClick={handleGenerate} disabled={genStatus === "loading" || polling}>
              {polling
                ? `${provider === "veo" ? "Veo" : "Seedance"} sedang membuat video (±1-3 menit)...`
                : genStatus === "loading" ? "Mengirim..."
                : `Generate via ${provider === "veo" ? "Veo" : "Seedance Fast"} (biaya nyata, ${durVid} detik)`}
            </Button>
            {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
          </Card>
        ) : null}

        {/* 3. Hasil */}
        {videoUrl ? (
          <Card className="flex flex-col items-start gap-3">
            <h3 className="text-sm font-semibold text-navy">3. Hasil</h3>
            <video src={videoUrl} controls playsInline className="w-full max-w-sm rounded-2xl border border-line" />
            <a href={videoUrl} download={`keposting-${provider}-${Date.now()}.mp4`}
              className="text-sm font-medium text-primary hover:underline">Unduh MP4</a>
            <p className="text-xs text-navy/40">Video belum disimpan ke Riwayat (beta) — unduh sebelum menutup halaman.</p>

            {/* Pasang logo kanan bawah (watermark) — logo asli ditempel di atas
                video, BUKAN digambar AI, jadi tidak mungkin terdistorsi. */}
            <div className="mt-2 flex w-full flex-col gap-2 border-t border-line pt-3">
              <h4 className="text-sm font-semibold text-navy">Pasang Logo (kanan bawah)</h4>
              {logoUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="h-10 rounded bg-navy/5 p-1" />
                  <div className="flex gap-2">
                    {[110, 150, 200].map((s) => (
                      <button key={s} type="button" onClick={() => setLogoSize(s)}
                        className={`rounded-full border px-3 py-1 text-xs ${logoSize === s ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>
                        {s === 110 ? "Kecil" : s === 150 ? "Sedang" : "Besar"}
                      </button>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={pasangLogo} disabled={logoBusy}
                    className="px-3 py-1.5 text-xs">
                    {logoBusy ? "Memproses (\u00b130-60 dtk)..." : "Pasang Logo"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-navy/50">Logo bisnis tidak ditemukan di profil — upload logo dulu di Dashboard, lalu refresh halaman ini.</p>
              )}
              {logoError ? <p className="text-xs text-red-600">{logoError}</p> : null}
              {logoVideoUrl ? (
                <div className="flex flex-col items-start gap-2">
                  <video src={logoVideoUrl} controls playsInline className="w-full max-w-sm rounded-2xl border border-line" />
                  <a href={logoVideoUrl} download={`keposting-${provider}-logo-${Date.now()}.mp4`}
                    className="text-sm font-medium text-primary hover:underline">Unduh MP4 (dengan logo)</a>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </main>
    </>
  );
}
