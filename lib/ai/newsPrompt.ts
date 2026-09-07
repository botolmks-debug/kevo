import type { Lang } from "@/lib/ai/lang";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { buildProfileBlock } from "@/lib/ai/profileContext";
import { outputLangDirective } from "@/lib/ai/lang";
import { persona, captionRules, onImageRule, fontRule, jsonTail } from "@/lib/ai/autoContentPrompt";

/**
 * Judul+caption dari 1 berita industri (hasil searchIndustryNews). Beda dari
 * buildProdukContentPrompt: BUKAN promosi produk langsung — ini konten
 * INFORMASI BERITA MURNI (bukan opini/reaksi pribadi lagi — sempat begitu,
 * tapi diubah krn orang buka konten ini butuh info berita, bukan pendapat
 * bisnisnya soal beritanya), dengan CTA promosi bisnis dipisah jadi baris
 * tersendiri di akhir caption (bukan menyatu ke narasi beritanya). Tujuannya
 * variasi tema, bukan jualan langsung tiap post.
 */
export function buildNewsContentPrompt(
  profile: BusinessProfile,
  newsSummary: string,
  sourceName: string | null,
  lang?: Lang,
): string {
  const sourceLineId = sourceName
    ? `\nSumber berita: ${sourceName}.\nWAJIB cantumkan kredit sumber ini di AKHIR caption, format persis: "(via ${sourceName})" — supaya pembaca tahu ini bukan opini kosong, ada beritanya yang bisa dicek.`
    : "";
  const sourceLineEn = sourceName
    ? `\nNews source: ${sourceName}.\nYou MUST include this source credit at the END of the caption, exact format: "(via ${sourceName})" — so readers know this isn't a vague opinion, there's a real story behind it they can check.`
    : "";

  const coreId = `Kamu adalah pemilik bisnis yang lagi bikin konten REAKSI/OPINI terhadap sebuah berita yang relevan dengan industrimu — BUKAN post jualan produk langsung. Gaya kontennya seperti akun-akun komentar berita: judul headline yang nge-hook, lalu caption berisi ringkasan cerita + opini/insight singkat dari sudut pandang bisnismu.

${buildProfileBlock(profile, lang)}

BERITA YANG DIJADIKAN BAHAN (WAJIB ditulis ulang pakai kata-katamu sendiri, JANGAN kutip persis dari sumbernya):
${newsSummary}${sourceLineId}

ATURAN KONTEN:
- Judul (onImageText) = HOOK dari berita itu sendiri (fakta/angka/kejutan paling menarik), BUKAN nama produk/bisnismu. INI MENGGANTIKAN batas "maks 8 kata" di ONIMAGE_RULE di bawah — khusus format Berita, batasnya MAKSIMAL 12 KATA (bukan 8), supaya ada ruang cukup buat hook YANG TETAP menyebut subjek konkretnya. WAJIB tetap menyebut/menyiratkan SUBJEK KONKRET beritanya (nama produk/perusahaan/topik spesifik dari ringkasan di atas) — JANGAN sampai judulnya jadi kalimat abstrak yang bisa dipakai untuk berita apa pun (contoh SALAH: "Standar baru sedang dipaksakan ke kita semua" — tidak jelas ini soal apa; contoh BENAR: "OpenAI Rilis Model Baru, AI Sekarang Bisa Berpikir Runtut").
- CAPTION = INFORMASI BERITA MURNI, dirangkum detail & informatif, dalam kata-katamu sendiri — BUKAN opini/insight pribadi, BUKAN dikait-kaitkan ke bisnismu. Orang buka konten ini untuk TAHU BERITANYA, bukan untuk dengar pendapatmu soal bisnismu sendiri. INI MENGGANTIKAN instruksi "satu CTA halus di paragraf terakhir" di CAPTION_RULES di bawah — CTA-nya WAJIB dipisah jadi baris TERAKHIR TERSENDIRI (lihat poin CTA di bawah), bukan menyatu/melebur ke paragraf info beritanya.
- CAPTION WAJIB TETAP SPESIFIK ke berita ini — sebut jelas nama perusahaan/produk/orang/angka konkret dari ringkasan di atas, rangkum kronologi/detail pentingnya selengkap yang ringkasan di atas kasih. DILARANG jadi opini umum soal industri/teknologi tanpa menyebut fakta spesifik apa yang terjadi (contoh SALAH: "AI berkembang pesat, model baru bermunculan tiap hari" — tidak jelas kejadian spesifik apa; contoh BENAR: "OpenAI baru saja merilis model X yang bisa Y, diumumkan tanggal Z, diklaim lebih baik karena W").
- CTA (baris TERPISAH, di paling akhir, SETELAH paragraf info berita, SEBELUM hashtag) — 1 kalimat pendek & sederhana yang mempromosikan bisnis/produk INI SENDIRI secara umum (bukan menyambungkan ke topik beritanya) — contoh pola (sesuaikan produk/bisnisnya): "Butuh [kategori produk/jasa bisnis ini] yang gampang & cepat? Coba [nama bisnis]." Pisahkan dengan baris kosong dari paragraf info berita di atasnya, biar jelas kelihatan sebagai bagian terpisah (bukan menyatu ke ceritanya).
- JANGAN mengarang detail/angka yang tidak ada di ringkasan berita di atas.

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
- imageScene = deskripsi SATU adegan visual (dalam Bahasa Inggris, untuk AI image generation) yang menggambarkan SUASANA/KONDISI berita ini secara natural — boleh ada orang generik/anonim (wajah boleh terlihat, tidak wajib siluet) ATAU cukup lingkungan/objek relevan TANPA orang, mana yang lebih pas untuk ceritanya. JANGAN mencoba menggambarkan tokoh spesifik di berita. 1-2 kalimat saja.
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;

  const coreEn = `You are making an INFORMATIONAL news post about a story relevant to your industry — NOT a direct product-selling post, and NOT a personal-opinion post. The style is like a news-summary account: a hooky headline, then a caption that informs the reader about the actual story in detail.

${buildProfileBlock(profile, lang)}

NEWS STORY TO USE AS MATERIAL (MUST be rewritten in your own words, do NOT quote the source verbatim):
${newsSummary}${sourceLineEn}

CONTENT RULES:
- Headline (onImageText) = the HOOK from the news story itself (the most interesting fact/number/twist), NOT your product/business name. THIS OVERRIDES the "max 8 words" rule in ONIMAGE_RULE below — for the News format specifically, the limit is MAX 12 WORDS (not 8), giving enough room for a real hook that STILL names the concrete subject. MUST still name/imply the CONCRETE SUBJECT of the story (specific product/company/topic from the summary above) — do NOT let the headline become an abstract sentence that could apply to any story (wrong example: "A new standard is being forced on us all" — unclear what this is even about; right example: "OpenAI Releases New Model, AI Can Now Reason Step-by-Step").
- CAPTION = PURE NEWS INFORMATION, summarized in detail and informatively, in your own words — NOT personal opinion/insight, NOT tied back to your business. Readers open this content to LEARN THE NEWS, not to hear your opinion about your own business. THIS OVERRIDES the "one subtle CTA in the last paragraph" instruction in CAPTION_RULES below — the CTA MUST be split into its own separate final line (see CTA point below), not blended into the news-info paragraph.
- THE CAPTION MUST STAY SPECIFIC to this story — clearly name the specific company/product/person/concrete number from the summary above, summarize the chronology/important details as fully as the summary above allows. Do NOT drift into general opinion about the industry/technology without ever stating the specific thing that happened (wrong example: "AI is advancing fast, new models keep popping up" — unclear what specifically happened; right example: "OpenAI just released model X which can do Y, announced on date Z, claimed to be better because W").
- CTA (SEPARATE line, at the very end, AFTER the news-info paragraph, BEFORE the hashtags) — 1 short, simple sentence promoting THIS business/product itself generically (not tied to the news topic) — example pattern (adapt to the actual product/business): "Need [this business's product/service category] that's quick & easy? Try [business name]." Separate it with a blank line from the news-info paragraph above, so it clearly reads as a distinct part, not blended into the story.
- Do NOT invent details/numbers not present in the summary above.

JSON format: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
- imageScene = ONE visual scene description (for AI image generation) capturing the general MOOD/CONDITION of this news story, shot naturally — a generic/anonymous person (face may be visible, silhouette NOT required) OR just the relevant environment/objects with no person, whichever fits the story better. Do NOT attempt to depict the specific person from the story. 1-2 sentences only.
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;

  return `${persona(lang)}\n${outputLangDirective(lang)}\n${lang === "en" ? coreEn : coreId}`;
}
