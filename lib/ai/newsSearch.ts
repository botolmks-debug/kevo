import type { Lang } from "@/lib/ai/lang";
import { GEMINI_TEXT_MODEL } from "@/lib/ai/gemini";
import { OPENAI_TEXT_MODEL } from "@/lib/ai/openaiText";

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
const OPENAI_API_BASE = "https://api.openai.com/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export type NewsSearchResult =
  | { ok: true; summary: string; sourceName: string | null }
  | { ok: false; error: string };

/**
 * Format tanggal hari ini utk prompt — TANPA ini, model tidak punya patokan
 * "sekarang" dan bisa ambil berita LAMA yang cuma "terasa penting" dari
 * ingatannya (kejadian nyata: dikasih berita rilis model AI yang sudah lebih
 * dari setahun, disajikan seolah baru). Ditulis eksplisit dalam kalimat
 * (bukan cuma format ISO) supaya modelnya benar-benar "sadar" ini tanggal
 * acuan, bukan cuma angka yang lewat begitu saja.
 */
function todayContext(lang?: Lang): string {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  return lang === "en"
    ? `TODAY'S DATE IS ${iso}. Use this as your reference point for "recent" — do NOT rely on your training memory of "recent-sounding" news, since your training data has a cutoff and may make old news feel recent to you. A story is only valid if it genuinely happened within the last 1-2 months counting back from ${iso}. If you cannot find anything genuinely that recent, search more broadly but say so honestly rather than presenting old, widely-known news (e.g. a product launch from a year or more ago) as if it just happened.`
    : `TANGGAL HARI INI ADALAH ${iso}. Pakai ini sebagai acuan "baru" — JANGAN mengandalkan ingatan pelatihanmu soal berita yang "terasa baru", karena data pelatihanmu punya batas waktu dan bisa bikin berita lama terasa baru buatmu. Cerita cuma valid kalau BENAR-BENAR terjadi dalam 1-2 bulan terakhir dihitung mundur dari ${iso}. Kalau tidak ketemu yang benar-benar sebaru itu, cari yang lebih luas tapi akui itu terus terang — JANGAN sajikan berita lama yang sudah umum diketahui (mis. rilis produk dari setahun lebih lalu) seolah baru saja terjadi.`;
}

function buildInstruction(industry: string, mainProducts: string, lang?: Lang): string {
  return lang === "en"
    ? `${todayContext(lang)}

Search for ONE recent, genuinely interesting news story relevant to a small business in the "${industry}" industry (products/services: ${mainProducts || "-"}). Prefer stories with a human angle, a surprising number, or an industry trend — the kind of story a business owner in this field would find worth reacting to or sharing an opinion about. Avoid overly technical/dry stories.

Reply in this exact plain-text format (no JSON, no markdown):
SOURCE: <publication/site name, e.g. "Kompas", "Reuters" — write "unknown" if unclear>
SUMMARY: <3-5 sentences summarizing the story IN YOUR OWN WORDS — do not quote the article verbatim. Include the key fact/number/twist that makes it interesting, AND make sure the summary clearly names the specific subject (product/company/person/topic) — not just a vague takeaway.>`
    : `${todayContext(lang)}

Cari SATU berita terbaru yang benar-benar menarik dan relevan untuk pemilik usaha kecil di industri "${industry}" (produk/layanan: ${mainProducts || "-"}). Utamakan cerita yang punya sisi manusiawi, angka mengejutkan, atau tren industri — jenis cerita yang bikin pemilik usaha di bidang ini pengen kasih reaksi/opini. Hindari berita yang terlalu teknis/kering.

Jawab dalam format teks biasa PERSIS seperti ini (JANGAN JSON, JANGAN markdown):
SOURCE: <nama media/situs, mis. "Kompas", "Detik" — tulis "tidak diketahui" kalau tidak jelas>
SUMMARY: <3-5 kalimat merangkum ceritanya DENGAN KATA-KATA SENDIRI — jangan mengutip artikelnya persis. Sertakan fakta/angka/kejutan utama yang bikin ceritanya menarik, DAN pastikan ringkasannya menyebut jelas subjek spesifiknya (produk/perusahaan/orang/topik) — bukan cuma kesimpulan yang kabur.>`;
}

function parseNewsText(text: string): { summary: string; sourceName: string | null } | null {
  const sourceMatch = text.match(/SOURCE:\s*(.+)/i);
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]+)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : text.trim();
  const sourceRaw = sourceMatch ? sourceMatch[1].trim() : null;
  const sourceName = sourceRaw && !/tidak diketahui|unknown/i.test(sourceRaw) ? sourceRaw : null;
  if (!summary) return null;
  return { summary, sourceName };
}

/** Jalur UTAMA — Gemini Google Search grounding. */
async function searchWithGemini(industry: string, mainProducts: string, lang?: Lang): Promise<NewsSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY belum diisi." };

  const instruction = buildInstruction(industry, mainProducts, lang);
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
    const parsed = parseNewsText(text);
    if (!parsed) return { ok: false, error: "Tidak ada berita relevan ditemukan." };
    return { ok: true, ...parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mencari berita.";
    return { ok: false, error: msg.includes("abort") ? "Pencarian berita timeout, coba lagi." : msg };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * CADANGAN — OpenAI web_search tool (Responses API, BUKAN chat/completions
 * biasa — tool pencarian web cuma tersedia di endpoint /v1/responses).
 * Dipakai kalau jalur Gemini di atas gagal total.
 */
async function searchWithOpenAI(industry: string, mainProducts: string, lang?: Lang): Promise<NewsSearchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi." };

  const instruction = buildInstruction(industry, mainProducts, lang);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENAI_API_BASE}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        input: instruction,
        tools: [{ type: "web_search" }],
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data as { error?: { message?: string } } | null)?.error?.message;
      return { ok: false, error: msg || `OpenAI search gagal (status ${res.status}).` };
    }
    // Responses API: teks jawaban ada di data.output_text (convenience field)
    // ATAU harus digali dari array data.output[] (item type "message" ->
    // content[] item type "output_text"). Coba dua-duanya, urutan ini.
    let text: string | undefined = (data as { output_text?: string } | null)?.output_text;
    if (!text) {
      const output = (data as { output?: unknown[] } | null)?.output ?? [];
      for (const item of output) {
        const msg = item as { type?: string; content?: { type?: string; text?: string }[] };
        if (msg?.type === "message" && Array.isArray(msg.content)) {
          const found = msg.content.find((c) => c.type === "output_text" && typeof c.text === "string");
          if (found?.text) { text = found.text; break; }
        }
      }
    }
    if (!text || !text.trim()) return { ok: false, error: "OpenAI tidak menemukan berita relevan." };
    const parsed = parseNewsText(text);
    if (!parsed) return { ok: false, error: "Tidak ada berita relevan ditemukan." };
    return { ok: true, ...parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mencari berita.";
    return { ok: false, error: msg.includes("abort") ? "Pencarian berita timeout, coba lagi." : msg };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cari 1 berita/cerita yang MENARIK & RELEVAN dengan industri bisnis
 * tertentu. Jalur UTAMA: Gemini Google Search grounding. Kalau gagal total
 * (network/quota/API down) DAN OPENAI_API_KEY tersedia, otomatis coba jalur
 * CADANGAN via OpenAI web_search — pola sama dengan fallback yang sudah ada
 * di lib/ai/geminiJson.ts & lib/ai/geminiImage.ts untuk konten/gambar biasa.
 *
 * PENTING soal hak cipta/hak gambar: hasil dari fungsi ini HANYA berupa
 * RINGKASAN FAKTA dalam kata-kata AI sendiri (bukan kutipan/copy-paste
 * artikel), dan TIDAK PERNAH menyertakan foto asli dari beritanya — visual
 * konten dibuat terpisah lewat AI image generation bergaya siluet/generik
 * (lihat buildNewsScenePrompt di scenePrompt.ts), bukan re-upload foto
 * orang sungguhan dari berita. Nama sumber (mis. "Kompas", "Detik") boleh
 * disebut sebagai kredit ringan di caption, tapi bukan kewajiban hukum.
 */
export async function searchIndustryNews(
  industry: string,
  mainProducts: string,
  lang?: Lang,
): Promise<NewsSearchResult> {
  const primary = await searchWithGemini(industry, mainProducts, lang);
  if (primary.ok) return primary;

  if (!process.env.OPENAI_API_KEY) return primary; // tidak ada cadangan yang bisa dicoba
  console.warn("Gemini news search gagal (" + primary.error + "), mencoba fallback OpenAI...");
  return searchWithOpenAI(industry, mainProducts, lang);
}
