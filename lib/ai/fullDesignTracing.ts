/**
 * FULL DESIGN TRACING — EKSPERIMENTAL
 * -------------------------------------
 * Dipanggil SETELAH fullDesignPipeline.ts berhasil (gambar desain lengkap
 * sudah jadi & lolos validasi ejaan). Tahap ini mencoba memisahkan teks yang
 * sudah dibakar Gemini jadi objek FreeItem yang bisa diedit/digeser user:
 *
 * 1. Deteksi semua blok teks + posisi/gaya perkiraan (traceTextElements.ts)
 * 2. Hapus teks dari gambar, dapat versi bersih (removeTextFromImage.ts)
 * 3. (1) dan (2) DIJALANKAN PARALEL — sama-sama baca gambar yang sama,
 *    tidak saling bergantung.
 * 4. Bangun FreeItem per blok teks terdeteksi, font dipetakan ke kategori
 *    terdekat dari FONT_OPTIONS yang sudah ada.
 *
 * KEGAGALAN PARSIAL: kalau salah satu langkah gagal (deteksi kosong ATAU
 * hapus-teks gagal), TIDAK menggagalkan seluruh fitur — fallback ke gambar
 * asli (dengan teks masih terbakar, seperti tahap 1 biasa) tanpa items.
 * User tetap dapat hasil, cuma tidak dapat editability tracing-nya.
 */

import { randomUUID } from "crypto";
import { traceTextElements } from "./traceTextElements";
import { removeTextFromImage } from "./removeTextFromImage";
import { FONT_OPTIONS } from "../templates/fonts";
import type { AspectRatio } from "../templates/types";
import type { FreeItem } from "../editor/layoutOverrides";

export interface TracingInput {
  designDataUri: string; // hasil fullDesignPipeline (masih ada teks terbakar)
  ratio: AspectRatio;
  lang: "id" | "en";
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>;
}

export interface TracingOutput {
  traced: boolean; // true kalau tracing BERHASIL (ada minimal 1 teks + gambar bersih)
  cleanPhotoDataUri: string; // kalau traced=false, ini SAMA dengan designDataUri asli
  items: FreeItem[];
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT_BY_RATIO: Record<AspectRatio, number> = { "4:5": 1350, "1:1": 1080, "9:16": 1920 };

function fontIdForStyle(style: "sans" | "serif" | "display" | "script"): { id: string; family: string } {
  const match = FONT_OPTIONS.find((f) => f.style === style) ?? FONT_OPTIONS[0];
  return { id: match.id, family: match.family };
}

/** Perkiraan font size (px) dari tinggi kotak (hPct) — kotak lebih tinggi = teks lebih besar. */
function fontSizeFromHeight(hPct: number, canvasHeight: number): number {
  const boxHeightPx = (hPct / 100) * canvasHeight;
  return Math.max(16, Math.min(120, Math.round(boxHeightPx * 0.7)));
}

export async function traceFullDesign(input: TracingInput): Promise<TracingOutput> {
  const base64 = input.designDataUri.replace(/^data:image\/\w+;base64,/, "");
  const mimeMatch = input.designDataUri.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch?.[1] || "image/png";

  const [detectedBlocks, removeResult] = await Promise.all([
    traceTextElements(base64, mimeType, input.callGeminiVision),
    removeTextFromImage(base64, mimeType, input.ratio, input.lang),
  ]);

  // Syarat berhasil: ADA minimal 1 teks terdeteksi DAN gambar bersih berhasil dibuat.
  // Kalau salah satu gagal, tracing dianggap gagal total (fallback ke gambar asli) —
  // karena FreeItem teks di atas gambar yang MASIH ADA teks lama = dobel/tumpang tindih.
  if (detectedBlocks.length === 0 || !removeResult.ok || !removeResult.dataUri) {
    console.warn("[fullDesignTracing] tracing gagal, fallback ke gambar asli (tanpa editability)", {
      detectedCount: detectedBlocks.length,
      removeOk: removeResult.ok,
    });
    return { traced: false, cleanPhotoDataUri: input.designDataUri, items: [] };
  }

  const canvasHeight = CANVAS_HEIGHT_BY_RATIO[input.ratio];
  const items: FreeItem[] = detectedBlocks.map((block) => {
    const font = fontIdForStyle(block.fontStyle);
    const x = Math.round((block.xPct / 100) * CANVAS_WIDTH);
    const y = Math.round((block.yPct / 100) * canvasHeight);
    const w = Math.round((block.wPct / 100) * CANVAS_WIDTH);
    const h = Math.round((block.hPct / 100) * canvasHeight);
    const fontSize = fontSizeFromHeight(block.hPct, canvasHeight);

    return {
      id: `trace-${randomUUID().slice(0, 8)}`,
      kind: "text",
      x,
      y,
      w: Math.max(60, w),
      h: Math.max(fontSize + 8, h),
      text: block.text,
      fontFamily: font.family,
      fontSize,
      fontWeight: block.bold ? 700 : 400,
      color: block.color,
      align: block.align,
      shadow: { blur: 8, color: "#000000", opacity: 0.35 },
    };
  });

  return { traced: true, cleanPhotoDataUri: removeResult.dataUri, items };
}
