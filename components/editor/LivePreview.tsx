"use client";

import { useEffect, useRef, useState } from "react";
import { buildRenderInput } from "@/app/generate/buildRenderInput";
import type { AspectRatio, Template } from "@/lib/templates/types";

// Render LIVE memakai mesin Satori asli (via /api/render) — persis "Simpan Gambar".
// Foto & logo dikonversi ke data URI (cache) supaya cepat, identik dengan export,
// dan tidak di-fetch ulang server tiap render. Di-debounce.

async function urlToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 4) return null;
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

/** Hook: kembalikan URL gambar hasil render Satori (blob URL) + status. */
export function useLiveRender(
  template: Template | null,
  values: Record<string, string>,
  ratio: AspectRatio,
  enabled = true,
): { url: string | null; rendering: boolean; failed: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);

  const photoCache = useRef<{ src: string; dataUri: string } | null>(null);
  const logoCache = useRef<{ src: string; dataUri: string } | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = enabled && template ? JSON.stringify(buildRenderInput(template, values, ratio)) : "";

  useEffect(() => {
    if (!enabled || !template) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setRendering(true);
    setFailed(false);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      try {
        let renderValues = values;
        const photo = values.photo;
        if (photo && !photo.startsWith("data:")) {
          if (photoCache.current?.src === photo) {
            renderValues = { ...values, photo: photoCache.current.dataUri };
          } else {
            const d = await urlToDataUri(photo);
            if (d) { photoCache.current = { src: photo, dataUri: d }; renderValues = { ...values, photo: d }; }
          }
        }
        if (myReq !== reqIdRef.current) return;

        let renderTpl = template;
        const logoUrl = template.brand.logoUrl;
        if (logoUrl && !logoUrl.startsWith("data:")) {
          if (logoCache.current?.src === logoUrl) {
            renderTpl = { ...template, brand: { ...template.brand, logoUrl: logoCache.current.dataUri } };
          } else {
            const d = await urlToDataUri(logoUrl);
            if (d) { logoCache.current = { src: logoUrl, dataUri: d }; renderTpl = { ...template, brand: { ...template.brand, logoUrl: d } }; }
          }
        }
        if (myReq !== reqIdRef.current) return;

        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRenderInput(renderTpl, renderValues, ratio)),
        });
        if (myReq !== reqIdRef.current) return;
        if (!res.ok) { setRendering(false); setFailed(true); return; }
        const blob = await res.blob();
        if (myReq !== reqIdRef.current) return;
        const newUrl = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = newUrl;
        setUrl(newUrl);
        setRendering(false);
      } catch {
        if (myReq === reqIdRef.current) { setRendering(false); setFailed(true); }
      }
    }, 180);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  return { url, rendering, failed };
}
