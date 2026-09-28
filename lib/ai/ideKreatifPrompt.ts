import type { Lang } from "@/lib/ai/lang";
import { outputLangDirective } from "@/lib/ai/lang";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { buildProfileBlock } from "@/lib/ai/profileContext";

/**
 * Prompt "brainstorm 5 ide konten tidak biasa" untuk General > Ide Kreatif AI.
 * AI diminta BERPIKIR seperti creative director: pahami pelanggan, cari
 * benda/momen/format yang dekat dengan hidup mereka, lalu belokkan jadi ide
 * visual yang bikin berhenti scroll. Variasi dijaga lewat:
 *  1) "lensa kreatif" acak tiap panggilan (bukan daftar format tetap),
 *  2) daftar ide yang sudah pernah dipakai user (dikirim client),
 *  3) caption terakhir user (anti-repetisi topik).
 */

const LENSES_ID = [
  "benda sehari-hari yang semua orang kenal (dokumen, kertas, layar, kemasan) dipakai untuk bercerita",
  "parodi format yang sudah dikenal publik (poster film, lowongan kerja, rapor, undangan, surat peringatan, brosur)",
  "personifikasi: masalah pelanggan atau produk dijadikan karakter",
  "metafora visual: masalah digambarkan sebagai hal lain yang tak terduga",
  "hiperbola absurd tapi masuk akal",
  "plot twist / kebalikan dari yang biasa orang harapkan",
  "sebelum-sesudah dalam SATU frame dengan cara tidak biasa",
  "data kehidupan sehari-hari dijadikan grafik/infografis lucu",
  "sudut pandang (POV) sebuah benda atau produk",
  "miniatur / diorama kecil",
  "barang bukti ala investigasi / TKP yang lucu",
  "close-up detail kecil yang sangat relatable",
  "parodi UI game atau aplikasi (level up, loading bar, achievement, error message)",
  "rambu / petunjuk / manual penggunaan parodi",
  "nostalgia barang jadul era 90-an dan 2000-an",
  "budaya sehari-hari Indonesia (warung, arisan, grup keluarga, antre, mudik, tanggal tua)",
  "teka-teki visual yang memancing komentar",
  "pesan dari masa depan atau masa lalu",
  "eksperimen / laporan ilmiah parodi",
  "peta, denah, atau rute yang bercerita",
];

const LENSES_EN = [
  "everyday objects everyone recognizes (documents, paper, screens, packaging) used to tell a story",
  "parody of a well-known format (movie poster, job ad, report card, invitation, warning letter, brochure)",
  "personification: the customer's problem or the product becomes a character",
  "visual metaphor: the problem shown as something unexpected",
  "absurd but believable exaggeration",
  "plot twist / the opposite of what people expect",
  "before-after inside ONE frame in an unusual way",
  "everyday-life data turned into a funny chart/infographic",
  "point of view of an object or product",
  "miniature / tiny diorama",
  "funny investigation evidence / crime-scene style",
  "close-up of a tiny, very relatable detail",
  "parody of a game or app UI (level up, loading bar, achievement, error message)",
  "parody sign / instructions / user manual",
  "nostalgia for 90s-2000s objects",
  "everyday local culture of the target audience",
  "visual riddle that invites comments",
  "a message from the future or the past",
  "parody science experiment / lab report",
  "a map, floor plan, or route that tells a story",
];

// Format yang sudah sering dipakai — boleh, tapi jangan mendominasi.
const COMMON_FORMATS =
  "struk belanja, notifikasi lock screen, galeri HP, poster DICARI, boarding pass, label nilai gizi, screenshot chat, poster film horor, headline koran, catatan tempel, kalender, surat tulisan tangan";

function pickLenses(lang: Lang | undefined, n: number): string[] {
  const pool = [...(lang === "en" ? LENSES_EN : LENSES_ID)];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** Model khusus brainstorm ide — lebih kuat dari model caption. */
export const GEMINI_IDEA_MODEL = process.env.GEMINI_IDEA_MODEL || "gemini-flash-latest";

// Contoh STANDAR KUALITAS (bukan untuk ditiru formatnya). Diambil dari ide
// yang Andri nilai menarik & terbukti hasil gambarnya bagus di Gemini.
const CONTOH_KUALITAS_ID = `CONTOH STANDAR KUALITAS (untuk usaha aplikasi pembuat konten; JANGAN tiru format/objeknya, tiru LEVEL kreativitas & detail promptGambar-nya):
{"nama": "Struk biaya bikin konten", "emoji": "🧾", "deskripsi": "Struk kasir berisi rincian biaya bikin konten secara manual, totalnya dicoret dan diganti solusi murah. Orang berhenti karena format struk langsung dikenali.", "judul": "Rincian yang bikin kaget", "promptGambar": "Foto close-up realistis sebuah struk kasir thermal yang agak kusut dan melengkung, tergeletak di meja kayu kerja di samping HP dan gelas kopi. Cahaya pagi alami dari samping, depth of field tipis, latar belakang blur. Tulisan di struk hitam, font monospace khas printer thermal, tajam dan terbaca. Baris TOTAL dicoret dengan spidol merah, di bawahnya tulisan tangan spidol merah.", "teksGambar": ["STRUK KONTEN HARIAN", "Fotografer ....... Rp500.000", "Desainer ......... Rp300.000", "Copywriter ....... Rp200.000", "TOTAL ......... Rp1.000.000", "Sekarang: cukup 1 foto HP"]}`;

const CONTOH_KUALITAS_EN = `QUALITY BENCHMARK EXAMPLE (for a content-creation app business; do NOT copy its format/object, copy its LEVEL of creativity and promptGambar detail):
{"nama": "Receipt of content costs", "emoji": "🧾", "deskripsi": "A cashier receipt itemizing the cost of making content manually, the total crossed out and replaced by a cheap solution. People stop because the receipt format is instantly recognizable.", "judul": "The bill nobody expected", "promptGambar": "Realistic close-up photo of a slightly crumpled, curled thermal cashier receipt lying on a wooden work desk next to a phone and a cup of coffee. Natural morning side light, shallow depth of field, blurred background. Receipt text in black thermal-printer monospace font, sharp and legible. The TOTAL line is crossed out with red marker, with red handwritten marker text below it.", "teksGambar": ["DAILY CONTENT RECEIPT", "Photographer ...... $300", "Designer .......... $200", "Copywriter ........ $150", "TOTAL ............. $650", "Now: just 1 phone photo"]}`;

export function buildIdeKreatifPrompt(input: {
  profile: BusinessProfile;
  lang?: Lang;
  avoid?: string[];
  antiRepetisiBlock?: string;
  momenBlock?: string;
}): string {
  const { profile, lang } = input;
  const en = lang === "en";
  const lenses = pickLenses(lang, 3);
  const avoid = (input.avoid ?? []).filter((a) => a.trim()).slice(0, 60);
  const avoidBlock = avoid.length
    ? (en
        ? `IDEAS ALREADY USED/SHOWN (do NOT repeat these or anything similar in format or angle):\n- ${avoid.join("\n- ")}`
        : `IDE YANG SUDAH PERNAH DIPAKAI/DITAMPILKAN (JANGAN diulang, termasuk yang mirip format atau sudutnya):\n- ${avoid.join("\n- ")}`)
    : "";
  const extras = [avoidBlock, input.antiRepetisiBlock ?? "", input.momenBlock ?? ""].filter((x) => x.trim()).join("\n\n");

  if (en) {
    return `You are a senior creative director for social media content, known for ideas that make people stop scrolling. You do NOT make generic stock-photo content (people tired in front of a laptop, smiling customers, a product sitting on a table).
${outputLangDirective(lang)}

${buildProfileBlock(profile, lang)}

${extras ? extras + "\n\n" : ""}THINK FIRST (internally, do not write it out):
1) Who exactly is the target customer? What does their day look like — objects, apps, places, small moments?
2) What real problem, fear, habit, or wish do they have that this business touches?
3) What would ordinary competitors post? Deliberately go somewhere else.
4) Brainstorm 10 candidate ideas. Score each 1-10 on: unusual/surprising, clearly relevant to this business, understood in 1 second as ONE still image. Discard the weak ones and keep the 5 best.

RULES for the 5 ideas:
- Each is a SINGLE still image (not video, not carousel), each with a DIFFERENT visual format and a DIFFERENT angle.
- At least 3 must come from these creative lenses (one each): ${lenses.map((l, i) => `(${i + 1}) ${l}`).join("; ")}.
- Common formats (${COMMON_FORMATS}) may be used for AT MOST 1 idea. Prefer fresh formats you invent.
- Humor welcome, never mocking customers. No real people/celebrities, no other brands, no gore, nothing about religion, ethnicity, or politics.

${CONTOH_KUALITAS_EN}

FIELDS per idea:
- nama: short idea name (max 6 words)
- emoji: 1 emoji
- deskripsi: 1-2 sentences for the business owner: what the image looks like and why it grabs attention
- judul: headline overlaid at the bottom of the image, max 7 words, no dashes, must not repeat the in-image text
- promptGambar: a COMPLETE, vivid image prompt (4-7 sentences) ready to send to an image AI: main subject & exactly what it looks like, setting & props, style (realistic photo / 3D / illustration / miniature, etc.), camera angle, lighting, mood. Describe where any text sits, but do NOT write the text itself here. Never ask for a logo, emblem, or the business name in the image.
- teksGambar: array of the EXACT texts that must appear inside the image, each max 32 characters, max 10 items, correct spelling. Use [] if the idea needs no text. NEVER include the business name or a logo — the real logo and name are added by the app separately.

Reply with ONLY valid JSON: {"ideas": [ ...exactly 5 items... ]}`;
  }

  return `Kamu creative director senior untuk konten media sosial, terkenal dengan ide yang bikin orang berhenti scroll. Kamu TIDAK membuat konten generik ala foto stok (orang capek di depan laptop, pelanggan tersenyum, produk di atas meja).
${outputLangDirective(lang)}

${buildProfileBlock(profile, lang)}

${extras ? extras + "\n\n" : ""}BERPIKIR DULU (dalam kepala, jangan ditulis):
1) Siapa persisnya target pelanggan usaha ini? Seperti apa hari-hari mereka — benda, aplikasi, tempat, momen kecil apa yang ada di hidup mereka?
2) Masalah, ketakutan, kebiasaan, atau keinginan nyata apa yang mereka punya dan disentuh usaha ini?
3) Kira-kira kompetitor biasa akan posting apa? Sengaja pergi ke arah lain.
4) Brainstorm 10 kandidat ide. Nilai masing-masing 1-10 untuk: tidak biasa/mengejutkan, jelas relevan dengan usaha ini, langsung dipahami dalam 1 detik sebagai SATU gambar diam. Buang yang lemah, ambil 5 terbaik.

ATURAN 5 ide:
- Masing-masing SATU gambar diam (bukan video, bukan carousel), tiap ide format visual BERBEDA dan sudut BERBEDA.
- Minimal 3 ide berangkat dari lensa kreatif ini (satu lensa per ide): ${lenses.map((l, i) => `(${i + 1}) ${l}`).join("; ")}.
- Format umum (${COMMON_FORMATS}) boleh dipakai MAKSIMAL 1 ide. Utamakan format segar hasil pikiranmu sendiri.
- Boleh lucu, tapi jangan merendahkan pelanggan. Tanpa orang/selebriti asli, tanpa merek lain, tanpa kekerasan/darah, tanpa SARA dan politik.

${CONTOH_KUALITAS_ID}

FIELD per ide:
- nama: nama ide singkat (maks 6 kata)
- emoji: 1 emoji
- deskripsi: 1-2 kalimat untuk pemilik usaha: gambarnya seperti apa dan kenapa menarik perhatian
- judul: judul yang ditempel di bawah gambar, maks 7 kata, tanpa tanda pisah, tidak mengulang teks di dalam gambar
- promptGambar: prompt gambar LENGKAP dan hidup (4-7 kalimat) yang siap dikirim ke AI gambar: subjek utama & persis seperti apa bentuknya, latar & properti, gaya (foto realistis / 3D / ilustrasi / miniatur, dll), sudut kamera, pencahayaan, suasana. Sebutkan di mana letak teks, tapi JANGAN tulis isi teksnya di sini. JANGAN minta logo, lambang, atau nama usaha muncul di gambar.
- teksGambar: array berisi teks PERSIS yang harus muncul di dalam gambar, tiap item maks 32 karakter, maks 10 item, ejaan benar. Isi [] kalau idenya tidak butuh teks. JANGAN PERNAH memasukkan nama usaha atau logo — logo & nama asli ditempel terpisah oleh aplikasi.

Jawab HANYA dengan JSON valid: {"ideas": [ ...tepat 5 item... ]}`;
}
