"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ObjectSelectModal — "✂️ Pilih Objek" ala Object Selection Tool Photoshop.
 *
 * - User klik objek di foto → AI (SlimSAM, jalan di BROWSER user, gratis,
 *   tanpa token) menyorot objeknya dengan warna biru.
 * - Klik lagi = tambah area. Mode "Kurangi" / Alt+klik = buang area.
 * - "Lepas Objek" → potongan PNG/WebP transparan dari PIKSEL ASLI foto
 *   (tidak digambar ulang AI, jadi pas 100%), lalu dikirim ke editor sebagai
 *   elemen gambar di posisi yang sama persis → bisa digeser/di-resize/diatur
 *   layernya (mis. taruh judul di BELAKANG objek).
 *
 * Worker: /public/sam-worker.js (dibuat sekali, dipakai ulang antar buka).
 */

export type CutoutResult = {
  src: string; // data URI (webp/png) transparan
  x: number; // koordinat kanvas template
  y: number;
  w: number;
  h: number;
  mirror: boolean;
};

type Props = {
  photoUrl: string;
  /** Foto latar di editor dicerminkan (flip kiri-kanan)? */
  mirror: boolean;
  /** Ukuran kanvas template (layout.canvas). */
  canvasW: number;
  canvasH: number;
  /** Zoom overscan foto di editor (DomEditor pakai scale(1.04)). */
  photoScale?: number;
  onDone: (r: CutoutResult) => void;
  onClose: () => void;
};

type Pt = { x: number; y: number; label: 0 | 1 };
type Status = "loading-model" | "encoding" | "ready" | "decoding" | "error";

const MAX_OUT_SIDE = 1400; // batas sisi terpanjang potongan (ukuran data tetap wajar)

// Worker dipakai ulang supaya model tidak dimuat ulang setiap buka modal.
let sharedWorker: Worker | null = null;
function getWorker(): Worker {
  if (!sharedWorker) sharedWorker = new Worker("/sam-worker.js", { type: "module" });
  return sharedWorker;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat foto."));
    img.src = url;
  });
}

export default function ObjectSelectModal({ photoUrl, mirror, canvasW, canvasH, photoScale = 1.04, onDone, onClose }: Props) {
  const [status, setStatus] = useState<Status>("loading-model");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [subtract, setSubtract] = useState(false);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [cutting, setCutting] = useState(false);

  const maskRef = useRef<{ data: Uint8Array; w: number; h: number } | null>(null);
  const [maskVersion, setMaskVersion] = useState(0);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  // 1) muat foto (untuk tampilan & potong) + kirim ke worker
  useEffect(() => {
    let alive = true;
    const worker = getWorker();
    const onMsg = (e: MessageEvent) => {
      if (!alive) return;
      const m = e.data || {};
      if (m.type === "status") {
        setStatus(m.status);
        if (typeof m.progress === "number") setProgress(m.progress);
      } else if (m.type === "ready") {
        setStatus("ready");
      } else if (m.type === "mask") {
        maskRef.current = { data: m.mask as Uint8Array, w: m.width, h: m.height };
        setMaskVersion((v) => v + 1);
        setStatus("ready");
      } else if (m.type === "error") {
        setStatus("error");
        setError(String(m.message || "Terjadi kesalahan."));
      }
    };
    worker.addEventListener("message", onMsg);
    loadImage(photoUrl)
      .then((el) => {
        if (!alive) return;
        setImg(el);
        worker.postMessage({ type: "load", url: photoUrl });
      })
      .catch((err) => {
        if (!alive) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Gagal memuat foto.");
      });
    return () => {
      alive = false;
      worker.removeEventListener("message", onMsg);
    };
  }, [photoUrl]);

  // 2) gambar sorotan biru + titik klik di atas foto
  useEffect(() => {
    const cv = overlayRef.current;
    if (!cv || !img) return;
    const W = img.naturalWidth, H = img.naturalHeight;
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const mk = maskRef.current;
    if (mk && mk.w === W && mk.h === H && points.length) {
      const id = ctx.createImageData(W, H);
      const d = id.data;
      for (let i = 0; i < mk.data.length; i++) {
        if (mk.data[i]) {
          const o = i * 4;
          d[o] = 18; d[o + 1] = 120; d[o + 2] = 255; d[o + 3] = 115;
        }
      }
      ctx.putImageData(id, 0, 0);
    }
    const r = Math.max(6, Math.round(Math.min(W, H) * 0.012));
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 1 ? "#12B3A0" : "#ef4444";
      ctx.fill();
      ctx.lineWidth = Math.max(2, r / 3);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  }, [img, points, maskVersion]);

  const decode = useCallback((pts: Pt[]) => {
    if (!pts.length) {
      maskRef.current = null;
      setMaskVersion((v) => v + 1);
      return;
    }
    setStatus("decoding");
    getWorker().postMessage({
      type: "decode",
      points: pts.map((p) => [p.x, p.y]),
      labels: pts.map((p) => p.label),
    });
  }, []);

  function onPick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (status !== "ready" && status !== "decoding") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const label: 0 | 1 = subtract || e.altKey ? 0 : 1;
    // Titik "kurangi" tanpa titik "tambah" tidak bermakna.
    if (label === 0 && !points.some((p) => p.label === 1)) return;
    const next = [...points, { x, y, label }];
    setPoints(next);
    decode(next);
  }

  function undoPoint() {
    const next = points.slice(0, -1);
    setPoints(next);
    decode(next);
  }

  function resetPoints() {
    setPoints([]);
    decode([]);
  }

  async function cutOut() {
    const mk = maskRef.current;
    if (!img || !mk || !points.length) return;
    setCutting(true);
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      if (mk.w !== W || mk.h !== H) throw new Error("Ukuran seleksi tidak cocok dengan foto. Coba lagi.");

      // bounding box objek
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          if (mk.data[row + x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) throw new Error("Belum ada objek yang terpilih. Klik objeknya dulu.");
      const PAD = 2;
      minX = Math.max(0, minX - PAD); minY = Math.max(0, minY - PAD);
      maxX = Math.min(W - 1, maxX + PAD); maxY = Math.min(H - 1, maxY + PAD);
      const bw = maxX - minX + 1, bh = maxY - minY + 1;

      // masker (alpha) seukuran kotak objek
      const maskCv = document.createElement("canvas");
      maskCv.width = bw; maskCv.height = bh;
      const mctx = maskCv.getContext("2d");
      if (!mctx) throw new Error("Browser tidak mendukung canvas.");
      const mid = mctx.createImageData(bw, bh);
      for (let y = 0; y < bh; y++) {
        const src = (y + minY) * W + minX;
        for (let x = 0; x < bw; x++) {
          if (mk.data[src + x]) mid.data[(y * bw + x) * 4 + 3] = 255;
        }
      }
      mctx.putImageData(mid, 0, 0);

      // potong piksel asli foto + terapkan masker (tepi dihaluskan sedikit)
      const k = Math.min(1, MAX_OUT_SIDE / Math.max(bw, bh));
      const ow = Math.max(1, Math.round(bw * k)), oh = Math.max(1, Math.round(bh * k));
      const out = document.createElement("canvas");
      out.width = ow; out.height = oh;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("Browser tidak mendukung canvas.");
      octx.drawImage(img, minX, minY, bw, bh, 0, 0, ow, oh);
      octx.globalCompositeOperation = "destination-in";
      octx.filter = "blur(0.6px)";
      octx.drawImage(maskCv, 0, 0, ow, oh);
      octx.filter = "none";
      octx.globalCompositeOperation = "source-over";

      let src = out.toDataURL("image/webp", 0.92);
      if (!src.startsWith("data:image/webp")) src = out.toDataURL("image/png");

      // petakan kotak objek (piksel foto) → koordinat kanvas template,
      // meniru tampilan foto di editor: object-fit: cover + scale(photoScale)
      // di tengah, opsional dicerminkan.
      const s = Math.max(canvasW / W, canvasH / H) * photoScale;
      const w = bw * s;
      const h = bh * s;
      const x = mirror
        ? canvasW / 2 - (minX + bw - W / 2) * s
        : canvasW / 2 + (minX - W / 2) * s;
      const y = canvasH / 2 + (minY - H / 2) * s;

      onDone({ src, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), mirror });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memotong objek.");
    } finally {
      setCutting(false);
    }
  }

  const busyText =
    status === "loading-model"
      ? `Menyiapkan AI seleksi… ${progress ? progress + "%" : ""} (pertama kali agak lama, berikutnya cepat)`
      : status === "encoding"
      ? "AI sedang mempelajari gambar…"
      : status === "decoding"
      ? "Menyeleksi…"
      : null;
  const canPick = status === "ready" || status === "decoding";
  const hasSelection = points.some((p) => p.label === 1) && !!maskRef.current;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-base font-bold text-navy">✂️ Pilih Objek</h3>
          <p className="text-xs text-navy/60">
            Klik objek yang mau dilepas. Klik lagi untuk menambah area, atau pakai mode <b>Kurangi</b> (Alt+klik) untuk membuang area.
          </p>
        </div>

        <div className="relative mx-auto w-full" style={{ maxWidth: 420 }}>
          {img ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" crossOrigin="anonymous" className="block h-auto w-full select-none rounded-lg" draggable={false} />
              <canvas ref={overlayRef} onClick={onPick}
                className={`absolute inset-0 h-full w-full rounded-lg ${canPick ? (subtract ? "cursor-cell" : "cursor-crosshair") : "cursor-wait"}`} />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg bg-navy/5 text-sm text-navy/50">Memuat foto…</div>
          )}
          {busyText && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit max-w-[90%] rounded-full bg-black/70 px-3 py-1 text-center text-[11px] text-white">
              {busyText}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-navy/15 text-xs font-semibold">
            <button type="button" onClick={() => setSubtract(false)}
              className={`px-3 py-1.5 ${!subtract ? "bg-primary text-white" : "text-navy"}`}>＋ Tambah</button>
            <button type="button" onClick={() => setSubtract(true)}
              className={`px-3 py-1.5 ${subtract ? "bg-red-500 text-white" : "text-navy"}`}>－ Kurangi</button>
          </div>
          <button type="button" onClick={undoPoint} disabled={!points.length}
            className="rounded-full border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-30">↶ Titik</button>
          <button type="button" onClick={resetPoints} disabled={!points.length}
            className="rounded-full border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-30">Reset</button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="text-sm text-navy/50 hover:text-navy">Batal</button>
          <button type="button" onClick={cutOut} disabled={!hasSelection || cutting || status === "decoding"}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {cutting ? "Memotong…" : "Lepas Objek"}
          </button>
        </div>
        <p className="text-[11px] text-navy/40">
          Objek yang dilepas muncul di posisi yang sama. Geser/perbesar sesukamu, dan pakai tombol Layer untuk menaruh teks di belakangnya.
        </p>
      </div>
    </div>
  );
}
