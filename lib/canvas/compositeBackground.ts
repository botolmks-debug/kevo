/**
 * Proses gambar produk di canvas browser:
 * 1. Gambar asli → cover ke ukuran target → Gaussian Blur
 * 2. Overlay warna pilihan user (30–50% opacity)
 * 3. Gradient vignette di pinggir (kedalaman warna)
 * 4. Gambar asli (tidak blur) di-paste lagi di atas → produk tetap tajam
 *
 * Return: data URI siap pakai sebagai `values.photo` di CanvasEditor.
 */

export interface CompositeOptions {
  imageUrl: string;       // URL foto produk asli
  bgColor: string;        // hex, mis. "#F97316"
  overlayOpacity?: number; // 0–1, default 0.35
  blurRadius?: number;    // px, default 18
  outWidth?: number;      // default 1080
  outHeight?: number;     // default 1350 (4:5)
}

/** hex "#RRGGBB" → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // CORS fallback
      fetch(url).then(r => r.blob()).then(b => {
        const objUrl = URL.createObjectURL(b);
        const img2 = new window.Image();
        img2.onload = () => { resolve(img2); URL.revokeObjectURL(objUrl); };
        img2.onerror = reject;
        img2.src = objUrl;
      }).catch(reject);
    };
    img.src = url;
  });
}

/** Scale + crop gambar agar cover box (w x h), centered. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  w: number, h: number,
) {
  const scaleX = w / img.naturalWidth;
  const scaleY = h / img.naturalHeight;
  const s = Math.max(scaleX, scaleY);
  const drawW = img.naturalWidth * s;
  const drawH = img.naturalHeight * s;
  ctx.drawImage(img, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
}

export async function compositeBackground(opts: CompositeOptions): Promise<string> {
  const {
    imageUrl,
    bgColor,
    overlayOpacity = 0.38,
    blurRadius = 18,
    outWidth = 1080,
    outHeight = 1350,
  } = opts;

  const img = await loadImage(imageUrl);

  // --- Canvas 1: latar (blur + overlay + vignette) ---
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = outWidth;
  bgCanvas.height = outHeight;
  const bgCtx = bgCanvas.getContext("2d")!;

  // Gambar asli, cover
  bgCtx.save();
  bgCtx.filter = `blur(${blurRadius}px)`;
  // Gambar sedikit lebih besar supaya tepi blur tidak potongan
  const pad = blurRadius * 2;
  const scaleX = (outWidth + pad * 2) / img.naturalWidth;
  const scaleY = (outHeight + pad * 2) / img.naturalHeight;
  const s = Math.max(scaleX, scaleY);
  bgCtx.drawImage(
    img,
    -pad + (outWidth + pad * 2 - img.naturalWidth * s) / 2,
    -pad + (outHeight + pad * 2 - img.naturalHeight * s) / 2,
    img.naturalWidth * s,
    img.naturalHeight * s,
  );
  bgCtx.restore();

  // Overlay warna
  const [r, g, b] = hexToRgb(bgColor);
  bgCtx.globalAlpha = overlayOpacity;
  bgCtx.fillStyle = `rgb(${r},${g},${b})`;
  bgCtx.fillRect(0, 0, outWidth, outHeight);
  bgCtx.globalAlpha = 1;

  // Vignette radial gradient di pinggir
  const vig = bgCtx.createRadialGradient(
    outWidth / 2, outHeight / 2, Math.min(outWidth, outHeight) * 0.25,
    outWidth / 2, outHeight / 2, Math.max(outWidth, outHeight) * 0.72,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  bgCtx.fillStyle = vig;
  bgCtx.fillRect(0, 0, outWidth, outHeight);

  // --- Canvas 2: gabungan (latar + produk tajam di atas) ---
  const out = document.createElement("canvas");
  out.width = outWidth;
  out.height = outHeight;
  const ctx = out.getContext("2d")!;

  // Tempel latar
  ctx.drawImage(bgCanvas, 0, 0);

  // Produk tajam di atas (cover, tanpa blur)
  drawCover(ctx, img, 0, 0, outWidth, outHeight);

  return out.toDataURL("image/png");
}