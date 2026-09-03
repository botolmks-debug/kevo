import type { Lang } from "@/lib/ai/lang";
import { GEMINI_TEXT_MODEL } from "@/lib/ai/gemini";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// PAKAI MODEL YANG SAMA dengan generateJsonContent (GEMINI_TEXT_MODEL) — bukan
// model terpisah yang belum pernah dites di akun ini. "gemini-flash-latest"
// sempat dicoba tapi ternyata itu ALIAS EKSPERIMENTAL resmi dari Google
// ("typically not suitable for production use", rate limit lebih ketat) —
// terlalu berisiko buat percobaan pertama. GEMINI_TEXT_MODEL sudah terbukti
// jalan di produksi untuk fitur lain, jadi dipakai ulang di sini. Kalau nanti
// ternyata model itu TIDAK mendukung tool google_search, override lewat env
// GEMINI_NEWS_SEARCH_MODEL ke model yang lebih besar (mis. gemini-2.5-flash).
const NEWS_SEARCH_MODEL = process.env.GEMINI_NEWS_SEARCH_MODEL || GEMINI_TEXT_MODEL;
const REQUEST_TIMEOUT_MS = 30_000;

export type NewsSearchResult =
  | { ok: true; summary: string; sourceName: string | null }
  | { ok: false; error: string };

/**
 * Cari 1 berita/cerita yang MENARIK & RELEVAN dengan industri bisnis
 * tertentu, pakai Gemini Google Search grounding (bukan web_search milik
 * Claude — ini API terpisah punya Gemini, dipanggil langsung dari server).
 *
 * PENTING soal hak cipta/hak gambar: hasil dari fungsi ini HANYA berupa
 * RINGKASAN FAKTA dalam kata-kata Gemini sendiri (bukan kutipan/copy-paste
 * artikel), dan TIDAK PERNAH menyertakan foto asli dari beritanya — visual
 * konten dibuat terpisah lewat AI image generation bergaya siluet/generik
 * (lihat buildSilhouetteNewsPrompt di scenePrompt.ts), bukan re-upload foto
 * orang sungguhan dari berita. Nama sumber (mis. "Kompas", "Detik") boleh
 * disebut sebagai kredit ringan di caption, tapi bukan kewajiban hukum.
 */
export async function searchIndustryNews(
  industry: string,
  mainProducts: string,
  lang?: Lang,
): Promise<NewsSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY belum diisi." };

  const instruction =
    lang === "en"
      ? `Search for ONE recent (ideally within the last 7-14 days), genuinely interesting news story relevant to a small business in the "${industry}" industry (products/services: ${mainProducts || "-"}). Prefer stories with a human angle, a surprising number, or an industry trend — the kind of story a business owner in this field would find worth reacting to or sharing an opinion about. Avoid overly technical/dry stories.

Reply in this exact plain-text format (no JSON, no markdown):
SOURCE: <publication/site name, e.g. "Kompas", "Reuters" — write "unknown" if unclear>
SUMMARY: <3-5 sentences summarizing the story IN YOUR OWN WORDS — do not quote the article verbatim. Include the key fact/number/twist that makes it interesting.>`
      : `Cari SATU berita terbaru (idealnya dalam 7-14 hari terakhir) yang benar-benar menarik dan relevan untuk pemilik usaha kecil di industri "${industry}" (produk/layanan: ${mainProducts || "-"}). Utamakan cerita yang punya sisi manusiawi, angka mengejutkan, atau tren industri — jenis cerita yang bikin pemilik usaha di bidang ini pengen kasih reaksi/opini. Hindari berita yang terlalu teknis/kering.

Jawab dalam format teks biasa PERSIS seperti ini (JANGAN JSON, JANGAN markdown):
SOURCE: <nama media/situs, mis. "Kompas", "Detik" — tulis "tidak diketahui" kalau tidak jelas>
SUMMARY: <3-5 kalimat merangkum ceritanya DENGAN KATA-KATA SENDIRI — jangan mengutip artikelnya persis. Sertakan fakta/angka/kejutan utama yang bikin ceritanya menarik.>`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_API_BASE}/models/${NEWS_SEARCH_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        tools: [{ google_search: {} }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Gemini search gagal (${res.status}): ${body.slice(0, 300)}` };
    }
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text || !text.trim()) return { ok: false, error: "Tidak ada berita relevan ditemukan." };

    const sourceMatch = text.match(/SOURCE:\s*(.+)/i);
    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]+)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : text.trim();
    const sourceRaw = sourceMatch ? sourceMatch[1].trim() : null;
    const sourceName = sourceRaw && !/tidak diketahui|unknown/i.test(sourceRaw) ? sourceRaw : null;

    if (!summary) return { ok: false, error: "Tidak ada berita relevan ditemukan." };
    return { ok: true, summary, sourceName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mencari berita.";
    return { ok: false, error: msg.includes("abort") ? "Pencarian berita timeout, coba lagi." : msg };
  } finally {
    clearTimeout(timeoutId);
  }
}
