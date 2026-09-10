// lib/ai/traceTextElements.ts
// EKSPERIMENTAL — deteksi teks yang sudah dibakar Gemini ke gambar (dari
// fullDesignPipeline), perkirakan posisi/gaya-nya, supaya bisa dibangun ulang
// sebagai FreeItem yang editable. Ini vision call BIASA (bukan API deteksi
// objek presisi) — grounding koordinatnya PERKIRAAN, bukan piksel-presisi.
// Wajar kalau posisi meleset sedikit; user tinggal geser manual lewat editor
// yang sudah ada.

export type DetectedFontStyle = "sans" | "serif" | "display" | "script";

export interface DetectedTextBlock {
  text: string;
  xPct: number; // 0-100, kiri kotak teks
  yPct: number; // 0-100, atas kotak teks
  wPct: number; // 0-100, lebar kotak teks
  hPct: number; // 0-100, tinggi kotak teks
  fontStyle: DetectedFontStyle;
  bold: boolean;
  color: string; // hex perkiraan warna teks
  align: "left" | "center" | "right";
}

const PROMPT = `Lihat gambar ini. Identifikasi SEMUA blok teks yang tertulis DI DALAM gambar
(judul, subjudul, badge/label — apa pun yang berupa tulisan, BUKAN bagian dari foto produk itu sendiri).

Untuk TIAP blok teks, perkirakan:
- teks persis yang tertulis
- posisi kotak teks dalam PERSEN terhadap ukuran gambar penuh (xPct/yPct = pojok kiri-atas kotak, wPct/hPct = lebar/tinggi kotak)
- gaya huruf yang PALING MIRIP: "sans" (tegas/modern), "serif" (klasik/elegan), "display" (besar/dekoratif/poster), atau "script" (tulisan tangan/kursif)
- apakah tebal (bold) atau tidak
- warna teks (perkiraan kode hex)
- perataan: "left", "center", atau "right"

BATASI ke MAKSIMAL 6 blok teks PALING UTAMA (judul, subjudul, badge) — kalau ada teks kecil/dekoratif/tidak jelas terbaca, ABAIKAN, jangan sertakan. Jawaban harus RINGKAS supaya tidak terpotong.

Balas HANYA JSON array, tanpa markdown/penjelasan:
[
  {"text":"...", "xPct":0-100, "yPct":0-100, "wPct":0-100, "hPct":0-100, "fontStyle":"sans|serif|display|script", "bold":true|false, "color":"#hex", "align":"left|center|right"}
]
Kalau tidak ada teks sama sekali, balas array kosong [].`;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);
}

export async function traceTextElements(
  imageBase64: string,
  mimeType: string,
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>
): Promise<DetectedTextBlock[]> {
  try {
    const response = await callGeminiVision(PROMPT, imageBase64, mimeType);
    const cleaned = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((b: any) => b && typeof b.text === "string" && b.text.trim().length > 0)
      .slice(0, 8) // batas wajar, cegah hasil ngaco/berlebihan
      .map((b: any) => ({
        text: String(b.text).trim().slice(0, 80),
        xPct: clamp(Number(b.xPct) || 0, 0, 95),
        yPct: clamp(Number(b.yPct) || 0, 0, 95),
        wPct: clamp(Number(b.wPct) || 30, 5, 100),
        hPct: clamp(Number(b.hPct) || 8, 2, 40),
        fontStyle: (["sans", "serif", "display", "script"].includes(b.fontStyle) ? b.fontStyle : "sans") as DetectedFontStyle,
        bold: Boolean(b.bold),
        color: isHex(b.color) ? b.color : "#FFFFFF",
        align: (["left", "center", "right"].includes(b.align) ? b.align : "left") as "left" | "center" | "right",
      }));
  } catch (err) {
    console.error("[traceTextElements] gagal deteksi, dianggap tidak ada teks:", err);
    return [];
  }
}
