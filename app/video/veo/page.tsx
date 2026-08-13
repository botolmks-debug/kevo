"use client";

/**
 * /video/veo — ADMIN ONLY (proxy.ts sudah redirect /video* utk non-admin).
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

export default function VeoPage() {
  const [images, setImages] = useState<PickableImage[]>([]);
  const [selected, setSelected] = useState<PickableImage | null>(null);
  const [productDesc, setProductDesc] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [aspect, setAspect] = useState<"9:16" | "16:9">("9:16");

  const [sb, setSb] = useState<Storyboard | null>(null);
  const [sbStatus, setSbStatus] = useState<Status>("idle");
  const [sbError, setSbError] = useState<string | null>(null);

  const [genStatus, setGenStatus] = useState<Status>("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/images").then((r) => r.json()).then((d) => setImages(d.images ?? [])).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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
        body: JSON.stringify({ productDescription: productDesc, targetMarket, durationSeconds: 8 }),
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
    try {
      const res = await fetch("/api/video/veo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: sb.videoPrompt,
          negativePrompt: sb.negativePrompt,
          productImageUrl: selected?.publicUrl,
          aspectRatio: aspect,
          durationSeconds: 8,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Gagal submit.");
      startPolling(d.operationName as string);
    } catch (e) {
      setGenStatus("error");
      setGenError(e instanceof Error ? e.message : "Gagal.");
    }
  }

  function startPolling(op: string) {
    setPolling(true);
    const check = async () => {
      try {
        const res = await fetch(`/api/video/veo/status?op=${encodeURIComponent(op)}`);
        const d = await res.json();
        if (d?.error) throw new Error(d.error);
        if (d?.done && d?.ready) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          // Unduh mp4 sebagai blob supaya bisa diputar + disimpan.
          const vid = await fetch(`/api/video/veo/status?op=${encodeURIComponent(op)}&dl=1`);
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
          <h1 className="text-2xl font-bold text-navy">Video Produk (Veo) — Eksperimen Admin</h1>
          <p className="mt-1 text-sm text-navy/60">
            OpenAI menyusun naskah & storyboard, Veo (Gemini) membuat videonya dari foto produk.
            Maks 8 detik, biaya nyata per klip, butuh Gemini API paid tier.
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
              {polling ? "Veo sedang membuat video (±1-3 menit)..." : genStatus === "loading" ? "Mengirim..." : "Generate Video (biaya nyata, 8 detik)"}
            </Button>
            {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
          </Card>
        ) : null}

        {/* 3. Hasil */}
        {videoUrl ? (
          <Card className="flex flex-col items-start gap-3">
            <h3 className="text-sm font-semibold text-navy">3. Hasil</h3>
            <video src={videoUrl} controls playsInline className="w-full max-w-sm rounded-2xl border border-line" />
            <a href={videoUrl} download={`keposting-veo-${Date.now()}.mp4`}
              className="text-sm font-medium text-primary hover:underline">Unduh MP4</a>
            <p className="text-xs text-navy/40">Video belum disimpan ke Riwayat (beta) — unduh sebelum menutup halaman.</p>
          </Card>
        ) : null}
      </main>
    </>
  );
}
