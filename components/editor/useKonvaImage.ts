"use client";

import { useEffect, useState } from "react";

/**
 * Load gambar buat Konva.Image. `crossOrigin="anonymous"` wajib supaya kanvas
 * tidak "tainted" kalau nanti diekspor lewat toDataURL (peringatan CORS di
 * spec-editor-kanvas-kevo.md §6) — untuk irisan ini kanvas cuma dipakai untuk
 * preview interaktif (PNG final tetap dari Satori), tapi disiapkan dari awal
 * supaya tidak jadi utang teknis.
 */
export function useKonvaImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [src]);

  // `src` yang kosong ditangani lewat turunan render (bukan setState di efek)
  // supaya tidak kena lint react-hooks/set-state-in-effect.
  return src ? image : null;
}
