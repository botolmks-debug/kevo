import type { Lang } from "@/lib/ai/lang";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { buildProfileBlock } from "@/lib/ai/profileContext";
import { outputLangDirective } from "@/lib/ai/lang";
import { persona, captionRules, onImageRule, fontRule, jsonTail } from "@/lib/ai/autoContentPrompt";

/**
 * Judul+caption dari 1 berita industri (hasil searchIndustryNews). Beda dari
 * buildProdukContentPrompt: BUKAN promosi produk langsung — ini konten
 * reaksi/opini/komentar terhadap berita, dengan bisnis user sebagai SUDUT
 * PANDANG (bukan bintang utama). Tujuannya variasi tema, bukan jualan
 * langsung tiap post.
 */
export function buildNewsContentPrompt(
  profile: BusinessProfile,
  newsSummary: string,
  sourceName: string | null,
  lang?: Lang,
): string {
  const sourceLineId = sourceName
    ? `\nSumber berita: ${sourceName} (boleh disebut ringan di caption sebagai kredit, mis. "(via ${sourceName})" — bukan kewajiban, tapi bagus buat kredibilitas).`
    : "";
  const sourceLineEn = sourceName
    ? `\nNews source: ${sourceName} (may be mentioned lightly in the caption as a credit, e.g. "(via ${sourceName})" — not required, but good for credibility).`
    : "";

  const coreId = `Kamu adalah pemilik bisnis yang lagi bikin konten REAKSI/OPINI terhadap sebuah berita yang relevan dengan industrimu — BUKAN post jualan produk langsung. Gaya kontennya seperti akun-akun komentar berita: judul headline yang nge-hook, lalu caption berisi ringkasan cerita + opini/insight singkat dari sudut pandang bisnismu.

${buildProfileBlock(profile, lang)}

BERITA YANG DIJADIKAN BAHAN (WAJIB ditulis ulang pakai kata-katamu sendiri, JANGAN kutip persis dari sumbernya):
${newsSummary}${sourceLineId}

ATURAN KONTEN:
- Judul (onImageText) = HOOK dari berita itu sendiri (fakta/angka/kejutan paling menarik), BUKAN nama produk/bisnismu. WAJIB tetap menyebut/menyiratkan SUBJEK KONKRET beritanya (nama produk/perusahaan/topik spesifik dari ringkasan di atas) — JANGAN sampai judulnya jadi kalimat abstrak yang bisa dipakai untuk berita apa pun (contoh SALAH: "Standar baru sedang dipaksakan ke kita semua" — tidak jelas ini soal apa; contoh BENAR: "OpenAI Rilis Model Baru, AI Sekarang Bisa Berpikir Runtut").
- Caption = ringkas ceritanya (kata-kata sendiri) + tambahkan 1-2 kalimat opini/insight/koneksi ke industrimu — biar terasa "kamu yang ngomong", bukan cuma copy berita.
- JANGAN membuat produk/bisnismu jadi topik utama — bisnismu cuma SUDUT PANDANG buat komentari berita ini, bukan yang dipromosikan.
- JANGAN mengarang detail/angka yang tidak ada di ringkasan berita di atas.

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
- imageScene = deskripsi SATU adegan visual (dalam Bahasa Inggris, untuk AI image generation) yang menggambarkan SUASANA/TEMA berita ini secara umum — WAJIB pakai siluet orang generik (backlit/siluet, wajah TIDAK terlihat jelas) kalau ada orang di adegan, JANGAN mencoba menggambarkan tokoh spesifik di berita. 1-2 kalimat saja.
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;

  const coreEn = `You are a business owner making a REACTION/OPINION post about a news story relevant to your industry — NOT a direct product-selling post. The style is like a news-commentary account: a hooky headline, then a caption that summarizes the story + adds a short opinion/insight from your business's point of view.

${buildProfileBlock(profile, lang)}

NEWS STORY TO USE AS MATERIAL (MUST be rewritten in your own words, do NOT quote the source verbatim):
${newsSummary}${sourceLineEn}

CONTENT RULES:
- Headline (onImageText) = the HOOK from the news story itself (the most interesting fact/number/twist), NOT your product/business name. MUST still name/imply the CONCRETE SUBJECT of the story (specific product/company/topic from the summary above) — do NOT let the headline become an abstract sentence that could apply to any story (wrong example: "A new standard is being forced on us all" — unclear what this is even about; right example: "OpenAI Releases New Model, AI Can Now Reason Step-by-Step").
- Caption = summarize the story (your own words) + add 1-2 sentences of opinion/insight/connection to your industry — so it feels like "you" talking, not just a copied news blurb.
- Do NOT make your product/business the main topic — your business is only the LENS for commenting on this news, not what's being promoted.
- Do NOT invent details/numbers not present in the summary above.

JSON format: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
- imageScene = ONE visual scene description (for AI image generation) capturing the general MOOD/THEME of this news story — MUST use a generic silhouette (backlit/silhouette, face NOT clearly visible) if a person appears, do NOT attempt to depict the specific person from the story. 1-2 sentences only.
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;

  return `${persona(lang)}\n${outputLangDirective(lang)}\n${lang === "en" ? coreEn : coreId}`;
}
