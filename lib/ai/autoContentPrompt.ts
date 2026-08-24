import { outputLangDirective, type Lang } from "@/lib/ai/lang";
import type { BusinessProfile, ContentGoal } from "@/lib/onboarding/businessProfile";
import { FONT_OPTIONS } from "@/lib/templates/fonts";

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE-AWARE PROMPT
// Semua string ID DIPERTAHANKAN persis seperti versi lama (default lang !== "en"
// = output Indonesia tak berubah). EN diberi versi parallel yang natural,
// bukan terjemahan kaku, supaya output SG/AU terasa native.
// Aturan hashtag: WAJIB sama bahasa dengan caption (tidak boleh mix).
// ═══════════════════════════════════════════════════════════════════════════

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

const CONTENT_GOAL_LABELS_ID: Record<ContentGoal, string> = {
  jualan: "jualan/penjualan",
  brand_awareness: "brand awareness",
  edukasi: "edukasi",
  loyalitas_pelanggan: "loyalitas pelanggan",
};

const CONTENT_GOAL_LABELS_EN: Record<ContentGoal, string> = {
  jualan: "sales/conversion",
  brand_awareness: "brand awareness",
  edukasi: "education",
  loyalitas_pelanggan: "customer loyalty",
};

function profileBlock(profile: BusinessProfile, lang?: Lang): string {
  const labels = isEn(lang) ? CONTENT_GOAL_LABELS_EN : CONTENT_GOAL_LABELS_ID;
  const goals =
    profile.positioning.contentGoals.map((goal) => labels[goal] ?? goal).join(", ") || "-";

  if (isEn(lang)) {
    return `Business profile (MUST be woven into the content as its foundation — don't be generic):
- Name: ${profile.business.name || "-"}
- Industry: ${profile.business.industry || "-"}
- Location: ${profile.business.location || "-"}
- Main products/services: ${profile.offering.mainProducts || "-"}
- Target customer: ${profile.offering.targetCustomer || "-"}
- Customer problem being solved: ${profile.offering.customerProblem || "-"}
- Differentiator/USP: ${profile.positioning.differentiator || "-"}
- Content goals: ${goals}
- Brand voice/tone: ${profile.positioning.tone || "neutral"}
- CTA: ${profile.positioning.cta || "-"}
- Brand story: ${profile.story || "-"}
- AVOID: ${profile.positioning.avoid || "-"}`;
  }

  return `Profil bisnis (WAJIB dirangkai jadi dasar konten — jangan generik):
- Nama: ${profile.business.name || "-"}
- Industri: ${profile.business.industry || "-"}
- Lokasi: ${profile.business.location || "-"}
- Produk/layanan utama: ${profile.offering.mainProducts || "-"}
- Target pelanggan: ${profile.offering.targetCustomer || "-"}
- Masalah pelanggan yang diselesaikan: ${profile.offering.customerProblem || "-"}
- Pembeda/USP: ${profile.positioning.differentiator || "-"}
- Tujuan konten: ${goals}
- Nada/gaya brand: ${profile.positioning.tone || "netral"}
- CTA: ${profile.positioning.cta || "-"}
- Cerita brand: ${profile.story || "-"}
- HINDARI: ${profile.positioning.avoid || "-"}`;
}

const FONT_LIST = FONT_OPTIONS.map((f) => `${f.id} (${f.style})`).join(", ");

const PERSONA_ID =
  "Kamu adalah gabungan ahli desain visual, ahli komunikasi marketing, dan content strategist untuk UMKM. " +
  "Rangkai data profil menjadi konten SPESIFIK, relevan, dan sesuai gaya brand. " +
  "TERPENTING: tulislah seolah KAMU sendiri adalah target pasarnya — kamu tahu persis apa yang mereka rasakan, " +
  "keluhkan, takutkan, dan impikan setiap hari. Bangun empati yang tulus sampai pembaca merasa \"ini gue banget\" / " +
  "\"kok ngerti banget sih\". Menulislah dari DALAM perasaan mereka, bukan dari luar sebagai penjual.";

const PERSONA_EN =
  "You are a hybrid of visual designer, marketing communications expert, and content strategist for small businesses. " +
  "Weave the profile data into content that is SPECIFIC, relevant, and consistent with the brand voice. " +
  "MOST IMPORTANTLY: write as if YOU are the target audience — you know exactly what they feel, " +
  "complain about, worry about, and dream of every day. Build genuine empathy so the reader feels 'this is me' / " +
  "'they really get it'. Write from INSIDE their experience, not from outside as a salesperson.";

function persona(lang?: Lang): string {
  return isEn(lang) ? PERSONA_EN : PERSONA_ID;
}

const CAPTION_RULES_ID =
  "caption = caption Instagram yang HIDUP dan berempati, dalam Bahasa Indonesia:\n" +
  "- Variasikan gaya pembuka SETIAP kali. HINDARI klise: \"Pernah nggak sih\", \"Bikin panik\", \"Tenang saja\", \"Dijamin\", \"bosku\", \"gaskeun\". Jangan mengulang kata yang sama.\n" +
  "- HINDARI struktur pembuka klise ini: pertanyaan retorik \"Pernah ngerasain...?\", \"Kesel ga sih kalo...?\", \"Kamu tim mana...?\"; opening angka \"Ini 3/5/7...\"; opening \"Rahasia...\", \"Trik...\", \"Cara agar...\".\n" +
  "- PILIH salah satu gaya pembuka SEGAR ini (rotasi, JANGAN pakai gaya yang sama di dua caption berurutan): (1) fragmen momen keseharian (\"Jam 11 malam. Mesin masih nyala. Kamu belum tidur.\"), (2) pengakuan jujur (\"Aku hampir menyerah bulan lalu\"), (3) statement kontroversial (\"Followers banyak bukan berarti laris\"), (4) observasi umum yang jujur TANPA angka (\"Kebanyakan orang lihat kemasan duluan, baru harga\"), (5) sudut pandang orang ketiga (\"Kata teman aku, katanya...\"), (6) langsung ke inti tanpa basa-basi (\"Ini masalahnya. Ini solusinya.\").\n" +
  "- Gunakan perumpamaan/analogi yang relevan.\n" +
  "- Sentuh PERASAAN pembaca: tunjukkan empati terhadap apa yang mereka rasakan, khawatirkan, atau impikan.\n" +
  "- Boleh dari sudut pandang pembaca (\"aku/kita\"), menyuarakan keseharian mereka.\n" +
  "- FORMAT WAJIB: pecah caption jadi 2-4 PARAGRAF PENDEK (1-2 kalimat per paragraf), dipisah BARIS KOSONG (\\n\\n di dalam string JSON) — JANGAN PERNAH satu paragraf panjang menyambung. Hashtag jadi paragraf terakhir sendiri.\n" +
  "- EMOJI: sisipkan 2-4 emoji total yang SESUAI mood teks (contoh: momen hangat ☕🌿, semangat usaha 💪✨, produk baru 🎉, tips 📌💡) — letakkan alami di akhir kalimat, maksimal 1-2 per paragraf, JANGAN menumpuk beruntun. HANYA emoji sopan & umum; DILARANG emoji kasar/vulgar/bermakna ganda (🖕😈🍆🍑💦 dan sejenisnya). Bagian hashtag tanpa emoji.\n" +
  "- Isi total 3-6 kalimat, satu CTA halus di paragraf terakhir sebelum hashtag, lalu WAJIB diakhiri 3-6 hashtag relevan (format #katakunci tanpa spasi di dalam tag). SEMUA hashtag WAJIB berbahasa Indonesia (samakan dengan bahasa caption). JANGAN PERNAH mengosongkan hashtag. Patuhi nada brand & hindari topik terlarang.";

const CAPTION_RULES_EN =
  "caption = a LIVING, empathetic Instagram caption, in English:\n" +
  "- Vary the opening style EVERY time. AVOID clichés: \"Elevate your\", \"Look no further\", \"In today's fast-paced world\", \"Take your X to the next level\", \"Game changer\", \"Ever wondered\", \"You know that feeling\", \"We've got you covered\", \"Let's dive in\". Don't repeat the same words or openings.\n" +
  "- Use relevant metaphors/analogies that feel human, not corporate.\n" +
  "- Touch the reader's EMOTIONS: show empathy for what they feel, worry about, or dream of.\n" +
  "- Reader-first perspective is welcome (\"I/we\"), voicing their day-to-day.\n" +
  "- REQUIRED FORMAT: break the caption into 2-4 SHORT PARAGRAPHS (1-2 sentences each), separated by a BLANK LINE (\\n\\n inside the JSON string) — NEVER one long run-on paragraph. Hashtags go in their own final paragraph.\n" +
  "- EMOJI: weave in 2-4 emojis total that MATCH the mood (cozy moment ☕🌿, hustle energy 💪✨, launch 🎉, tips 📌💡) — placed naturally at sentence ends, max 1-2 per paragraph, never stacked in a row. ONLY polite, universally safe emojis; NO rude/vulgar/double-meaning emojis (🖕😈🍆🍑💦 and similar). No emojis in the hashtag block.\n" +
  "- 3-6 sentences total, one subtle CTA in the last paragraph before the hashtags, then MUST end with 3-6 relevant hashtags (format #keyword, no spaces inside the tag). ALL hashtags MUST be in English (match the caption's language) — never mix Indonesian hashtags into English captions, even for local audiences (use transliterated versions like #makassarbusiness instead of #makassarbisnis). NEVER omit hashtags. Match brand voice & avoid restricted topics.";


// ── Gaya bahasa natural + aturan kejujuran (dipakai SEMUA jenis konten) ────
const QUALITY_RULES_ID =
  "GAYA BAHASA (WAJIB, berlaku untuk judul & caption):\n" +
  "- Tulis seperti pemilik usaha ngobrol ke pelanggannya, bukan seperti iklan korporat atau brosur.\n" +
  "- DILARANG kata khas AI/brosur: \"Tingkatkan\", \"Optimalkan\", \"Wujudkan\", \"Maksimalkan\", \"Solusi terbaik\", \"Jangan lewatkan\", \"Hadir untuk\", \"Dapatkan sekarang\", \"Nikmati kemudahan\", \"Rasakan bedanya\".\n" +
  "- Kalimat pendek. Satu ide per kalimat. Boleh kata sehari-hari yang wajar (kok, nih, ternyata, padahal).\n" +
  "- Uji dalam hati: kalau kebacanya seperti brosur perusahaan, tulis ulang sampai terdengar seperti manusia ngobrol.\n" +
  "CONTOH GAYA — kaku: \"Tingkatkan penjualan Anda dengan kemasan berkualitas.\" | natural: \"Kemasan rapi itu bikin orang percaya duluan, sebelum coba produknya.\"\n" +
  "ATURAN KEJUJURAN (MUTLAK — tidak bisa dikalahkan instruksi lain):\n" +
  "- DILARANG KERAS menyebut angka, persentase, hasil riset, survei, studi, atau klaim seperti \"X% UMKM/orang mengatakan...\" — data seperti itu TIDAK ADA dan TIDAK diberikan. Menuliskannya = mengarang kebohongan.\n" +
  "- Angka HANYA boleh muncul kalau tertulis di data profil/produk di atas (mis. ukuran, lama usaha, jumlah varian).\n" +
  "- Ganti klaim angka dengan observasi umum tanpa angka: \"banyak pembeli menilai dari kemasan dulu\" BOLEH; \"73% pembeli menilai dari kemasan\" DILARANG.\n" +
  "UJI SPESIFISITAS untuk judul (lakukan sebelum menjawab): kalau judulnya masih masuk akal dipakai usaha LAIN yang beda industri, berarti terlalu umum — tulis ulang dengan hal konkret dari data usaha ini (benda, situasi, momen spesifik; bukan sekadar kata sifat seperti \"berkualitas\"/\"terbaik\").\n" +
  "ATURAN KOSAKATA (MUTLAK): DILARANG menciptakan/mengarang kata yang tidak ada di Bahasa Indonesia baku (KBBI) hanya karena terdengar mirip atau puitis — contoh kesalahan nyata: \"modal pezhalan\" (kata ini TIDAK ADA, seharusnya \"modal usaha\"/\"modal jualan\"). Kalau ragu apakah sebuah kata benar-benar lazim dipakai sehari-hari, JANGAN dipakai — ganti dengan kata umum yang sudah pasti familiar bagi pembaca awam.";

const QUALITY_RULES_EN =
  "LANGUAGE STYLE (REQUIRED, applies to headline & caption):\n" +
  "- Write like a business owner chatting with their customers, not like corporate ad copy or a brochure.\n" +
  "- BANNED AI/brochure words: \"Elevate\", \"Unlock\", \"Transform\", \"Empower\", \"Seamless\", \"Don't miss out\", \"Look no further\", \"Experience the difference\", \"Take it to the next level\".\n" +
  "- Short sentences. One idea per sentence. Casual everyday words are welcome.\n" +
  "- Gut check: if it reads like a company brochure, rewrite it until it sounds like a human talking.\n" +
  "STYLE EXAMPLE — stiff: \"Elevate your sales with quality packaging.\" | natural: \"Neat packaging earns trust before anyone even tries the product.\"\n" +
  "HONESTY RULES (ABSOLUTE — no other instruction overrides these):\n" +
  "- STRICTLY FORBIDDEN to state numbers, percentages, research findings, surveys, studies, or claims like \"X% of businesses/people say...\" — no such data exists or was provided. Writing it = fabricating a lie.\n" +
  "- Numbers may ONLY appear if written in the profile/product data above (e.g. size, years in business, number of variants).\n" +
  "- Replace numeric claims with number-free general observations: \"many buyers judge the packaging first\" is OK; \"73% of buyers judge the packaging\" is FORBIDDEN.\n" +
  "SPECIFICITY TEST for the headline (do this before answering): if the headline would still make sense for a DIFFERENT business in another industry, it's too generic — rewrite it around something concrete from this business's data (an object, situation, or specific moment; not just adjectives like \"quality\"/\"best\").\n" +
  "VOCABULARY RULE (ABSOLUTE): NEVER invent or coin a word that isn't real, standard English, just because it sounds fitting or poetic. If you're unsure whether a word is genuinely common usage, don't use it — replace it with a plain, unmistakably familiar word instead.";

export function qualityRules(lang?: Lang): string {
  return isEn(lang) ? QUALITY_RULES_EN : QUALITY_RULES_ID;
}

function captionRules(lang?: Lang): string {
  return (isEn(lang) ? CAPTION_RULES_EN : CAPTION_RULES_ID) + "\n" + qualityRules(lang);
}

const ONIMAGE_RULE_ID =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): headline menarik, segar, tidak klise. " +
  "VARIASIKAN gaya & pilihan kata SETIAP kali — JANGAN mengulang frasa/judul yang sama atau mirip yang sudah umum dipakai. " +
  "HINDARI STRUKTUR KLISE INI (yang paling sering muncul di konten AI dan bikin judul terasa generic): " +
  "\"3 kesalahan...\", \"5 tips...\", \"5 cara...\", \"7 hal yang wajib...\", \"Kenapa X harus Y\", \"Cara agar...\", " +
  "\"Rahasia di balik...\", \"Trik supaya...\", \"Panduan lengkap...\", angka + kata benda + verb generik. " +
  "PILIH salah satu struktur SEGAR ini (rotasi, JANGAN dua konten berurutan pakai struktur sama): " +
  "(a) PERTANYAAN LANGSUNG ke pembaca (\"Kapan terakhir kali kamu ...?\", \"Berani jujur, ini masalah kamu?\"), " +
  "(b) STATEMENT KONTROVERSIAL (\"Yang bilang X, salah\", \"Followers banyak = omzet? Belum tentu\"), " +
  "(c) FRAGMEN CERITA (\"Jam 11 malam. Meja penuh. Dan kamu...\", \"Bulan lalu aku hampir menyerah\"), " +
  "(d) INSIGHT TERSEMBUNYI (\"Yang tidak diajarkan soal jualan online\", \"Bukan diskon yang bikin orang balik\"), " +
  "(e) PERBANDINGAN CURI PERHATIAN (\"Toko biasa vs toko yang laris\", \"Kamu yang ini, atau yang itu?\"), " +
  "(f) KATA TUNGGAL/DUA KATA POWERFUL sebagai hook (\"Kelelahan.\", \"Cukup sudah.\", \"Bosan pusing.\").";

const ONIMAGE_RULE_EN =
  "onImageText = short text ON the image (max 8 words): an engaging, fresh, non-cliché headline. " +
  "VARY the style & word choice EVERY time — DON'T repeat the same or similar phrases/titles that are commonly used. " +
  "AVOID overused corporate words like \"Elevate\", \"Unlock\", \"Transform\", \"Discover\", \"Introducing\" as sentence openers. " +
  "AVOID these CLICHÉ STRUCTURES (most common in AI-generated content, makes titles feel generic): " +
  "\"3 mistakes...\", \"5 tips...\", \"5 ways...\", \"7 things you must...\", \"Why X should Y\", \"How to...\", " +
  "\"The secret behind...\", \"The trick to...\", \"Complete guide to...\", number + noun + generic verb. " +
  "PICK one of these FRESH structures (rotate — don't use the same structure two contents in a row): " +
  "(a) DIRECT QUESTION to reader (\"When was the last time you...?\", \"Honest question: is this your problem?\"), " +
  "(b) CONTROVERSIAL STATEMENT (\"Whoever said X is wrong\", \"More followers ≠ more sales\"), " +
  "(c) STORY FRAGMENT (\"11 PM. Desk full. And you...\", \"Last month I almost gave up\"), " +
  "(d) HIDDEN INSIGHT (\"What nobody teaches about selling online\", \"It's not discounts that bring people back\"), " +
  "(e) EYE-CATCHING COMPARISON (\"Average shop vs shop that sells out\", \"Are you this one, or that one?\"), " +
  "(f) SINGLE/TWO-WORD POWERFUL hook (\"Exhausted.\", \"Enough is enough.\", \"Tired of struggling.\").";

function onImageRule(lang?: Lang): string {
  return isEn(lang) ? ONIMAGE_RULE_EN : ONIMAGE_RULE_ID;
}

// ── Headline angles ────────────────────────────────────────────────────────
const HEADLINE_ANGLES_ID = [
  "sudut MANFAAT utama (apa untungnya buat pembeli)",
  "sudut PERTANYAAN yang bikin penasaran",
  "sudut HASIL KONKRET (hanya dari data profil — tanpa mengarang angka)",
  "sudut MASALAH yang dirasakan lalu solusinya",
  "sudut EMOSI / momen relatable keseharian",
  "sudut AJAKAN atau urgensi yang halus",
  "sudut KEUNIKAN / hal yang beda dari produk ini",
];

const HEADLINE_ANGLES_EN = [
  "MAIN BENEFIT angle (what's in it for the buyer)",
  "curiosity-driven QUESTION angle",
  "CONCRETE RESULT angle (only from profile data — no invented numbers)",
  "PROBLEM felt then solution angle",
  "EMOTION / relatable day-to-day moment angle",
  "subtle CALL-TO-ACTION or gentle urgency angle",
  "UNIQUENESS angle / what makes this product different",
];

function pickHeadlineAngle(lang?: Lang): string {
  const arr = isEn(lang) ? HEADLINE_ANGLES_EN : HEADLINE_ANGLES_ID;
  return arr[Math.floor(Math.random() * arr.length)];
}

const PRODUK_VIRAL_ANGLES_ID = [
  "sudut HOOK VIRAL — kalimat pembuka yang mengejutkan/memancing rasa penasaran ekstrem, bikin orang berhenti scroll",
  "sudut MASALAH SEBAGAI HOOK — sebut masalah spesifik yang PASTI dialami target pasar (bikin mereka merasa 'ini gue banget') sebelum mengarah ke produk",
  "sudut BERPOTENSI DISIMPAN (save-worthy) — framing seperti checklist singkat atau 'hal yang wajib tahu sebelum beli/pakai [kategori produk]' yang orang ingin simpan sebagai referensi",
  "sudut PENGUNGKAPAN/KEJUTAN — 'ternyata...', 'bedanya cuma...', yang menantang asumsi umum orang soal produk/industrinya",
  "sudut RASA PENASARAN — janjikan sesuatu di judul yang jawaban lengkapnya baru terungkap di caption",
];

const PRODUK_VIRAL_ANGLES_EN = [
  "VIRAL HOOK angle — an opening line that surprises or triggers extreme curiosity, making people stop scrolling",
  "PROBLEM-AS-HOOK angle — name a specific problem the target audience DEFINITELY has ('this is me' recognition) before pivoting to the product",
  "SAVE-WORTHY angle — framing like a mini checklist or 'things you must know before buying/using [product category]' that people want to save for reference",
  "REVEAL/SURPRISE angle — 'turns out...', 'the only difference is...' that challenges common assumptions about the product/industry",
  "CURIOSITY angle — promise something in the headline whose full answer only appears in the caption",
];

function pickHeadlineAngleForProduk(lang?: Lang): string {
  const base = isEn(lang) ? HEADLINE_ANGLES_EN : HEADLINE_ANGLES_ID;
  const viral = isEn(lang) ? PRODUK_VIRAL_ANGLES_EN : PRODUK_VIRAL_ANGLES_ID;
  const pool = [...base, ...viral];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Instruksi "WTF hook" — dipakai HANYA saat user mencentang tombol 🔥.
 * Diteruskan ke builder konten lewat parameter `extra` (produk/gabung/general).
 * PENTING: pagar kejujuran sengaja dibuat tegas — model kalau disuruh "bikin
 * heboh" cenderung MENGARANG (kasus nyata: "Botol Pir" ditafsir jadi bentuk
 * lalu dikarang lawan katanya "silinder"). Hook boleh mengejutkan, TAPI wajib
 * benar sesuai data produk/profil. Clickbait bohong DILARANG.
 */
export function hookInstruction(lang?: Lang): string {
  if (isEn(lang)) {
    return `HEADLINE STYLE OVERRIDE — STRONG SCROLL-STOPPER ("hook") MODE:
The HEADLINE (onImageText) must STOP the thumb in the first second. Be bold: open a curiosity gap the reader NEEDS to close. A plain descriptive title is a FAIL here — if it reads like a normal caption, rewrite it harder.
Pick ONE high-impact pattern and commit fully:
- Pattern-interrupt claim: "Most people <do X wrong> — here's the fix"
- Direct warning: "Stop <common mistake> before you <consequence>"
- Curiosity gap: "The real reason <surprising outcome>…" (don't reveal it in the headline)
- Contrarian truth: "<Thing everyone assumes> is actually <the opposite> — here's why"
- Loss/mistake framing: "<Overlooked thing> is quietly costing you <specific loss>"
- Callout to the reader: speak directly ("kamu"/"you"), make it feel personal and urgent.
HARD RULES (non-negotiable — boldness never overrides these):
- The hook MUST be TRUE and grounded in the product/profile data above. NEVER invent facts, numbers, comparisons, or attributes not given. Bold framing of a REAL point — never a fabricated one.
- Treat any product NAME as a name, not a description — never reinterpret it into a shape, category, or claim.
- No all-caps shouting, no stacked "!!!", no "OMG/VIRAL/GILA" spam energy — the surprise is in the IDEA, not loud punctuation. Stay in the brand voice.
- Short and punchy (headline length). The content underneath must honestly deliver what the hook promises.`;
  }
  return `OVERRIDE GAYA JUDUL — MODE PENAHAN-SCROLL KUAT ("hook"):
JUDUL (onImageText) HARUS menghentikan jempol di 1 detik pertama. Berani: buka celah rasa penasaran yang bikin pembaca WAJIB cari tahu. Judul deskriptif biasa = GAGAL — kalau kebacanya seperti caption biasa, tulis ulang lebih nendang.
Pilih SATU pola berdampak tinggi dan totalitas:
- Klaim pemutus pola: "Kebanyakan orang <salah lakukan X> — ini cara benarnya"
- Peringatan langsung: "Berhenti <kesalahan umum> sebelum <akibatnya>"
- Celah penasaran: "Alasan sebenarnya kenapa <hasil mengejutkan>…" (jangan bocorkan di judul)
- Kebenaran kontra-dugaan: "<Yang orang kira benar> ternyata <kebalikannya> — ini alasannya"
- Bingkai kerugian/kesalahan: "<Hal yang diremehkan> diam-diam bikin kamu rugi <kerugian spesifik>"
- Sapa pembaca langsung: pakai "kamu", bikin terasa personal & mendesak.
ATURAN KERAS (tak bisa ditawar — keberanian TAK PERNAH mengalahkan ini):
- Hook WAJIB BENAR & berdasar data produk/profil di atas. JANGAN mengarang fakta, angka, perbandingan, atau atribut yang tak diberikan. Bingkai berani dari poin NYATA — bukan poin karangan.
- Perlakukan NAMA produk sebagai nama, bukan deskripsi — jangan tafsirkan jadi bentuk/kategori/klaim.
- Dilarang HURUF KAPITAL semua, dilarang "!!!" bertumpuk, dilarang energi spam "OMG/VIRAL/GILA" — kejutan ada di IDE, bukan tanda baca heboh. Tetap dalam nada brand.
- Singkat & nendang (panjang judul). Isi konten di baliknya WAJIB menepati janji hook.`;
}

const PERSPECTIVE_ANGLES_ID = [
  "EFISIENSI WAKTU untuk hal lain — bukan cuma soal cepat, tapi apa yang jadi BISA dilakukan pelanggan karena waktu/tenaga yang terhemat",
  "KONSISTENSI & KUALITAS — bagaimana produk/layanan ini menjaga standar yang susah dijaga sendiri secara manual/berulang",
  "MENGURANGI BEBAN MENTAL — bukan cuma soal teknis, tapi rasa lega/tenang karena tidak perlu terus memikirkan hal itu",
  "PENGHEMATAN BIAYA/SUMBER DAYA dibanding cara lama atau alternatif lain",
  "PELUANG BARU yang terbuka — apa yang jadi mungkin dilakukan pelanggan SETELAH pakai produk/layanan ini, yang sebelumnya susah/tidak sempat",
  "KESAN PROFESIONAL/KREDIBEL — bagaimana produk ini bikin usaha pelanggan terlihat lebih rapi/terpercaya di mata orang lain",
  "KEBERLANJUTAN JANGKA PANJANG — solusi untuk masalah yang datang BERULANG terus-menerus, bukan cuma satu momen",
  "FLEKSIBILITAS/KEMUDAHAN ADAPTASI — bagaimana produk ini menyesuaikan situasi pelanggan yang berubah-ubah",
  "RASA AMAN/TENANG — mengurangi risiko kesalahan, kerugian, atau hal buruk yang bisa terjadi tanpa produk ini",
  "KEMUDAHAN MEMULAI — menghilangkan hambatan/kerumitan di awal yang biasanya bikin orang ragu atau menunda",
  "SKALA/PERTUMBUHAN — bagaimana produk ini membantu usaha pelanggan berkembang lebih besar, bukan cuma bertahan",
  "PERSONALISASI — hasil yang terasa dibuat khusus untuk kebutuhan pelanggan itu sendiri, bukan solusi generik",
  "KONTROL/OTONOMI — pelanggan jadi punya kendali lebih besar atas sesuatu yang sebelumnya bergantung ke pihak lain",
  "KOMUNITAS/RASA TERHUBUNG — bagaimana produk ini menghubungkan pelanggan dengan orang lain yang senasib/sepemikiran",
  "KEPUASAN INSTAN vs HASIL JANGKA PANJANG — bandingkan manfaat yang terasa langsung dengan yang baru terasa belakangan",
  "MENGHINDARI FOMO/KETINGGALAN — bagaimana produk ini bikin pelanggan tetap relevan/tidak tertinggal tren atau kompetitor",
  "KESEDERHANAAN — mengubah sesuatu yang tadinya rumit/berlapis jadi satu langkah simpel",
  "KEPERCAYAAN DIRI — bagaimana pakai produk ini bikin pelanggan lebih yakin mengambil keputusan atau tampil di depan orang lain",
  "NILAI TERSEMBUNYI produk — manfaat sampingan yang jarang disadari orang saat pertama kali pakai",
  "PERBANDINGAN SEBELUM/SESUDAH — gambarkan kontras jelas antara hidup/usaha pelanggan sebelum dan sesudah pakai produk ini",
];

const PERSPECTIVE_ANGLES_EN = [
  "TIME EFFICIENCY for other things — not just about speed, but what the customer CAN NOW do because of the time/energy saved",
  "CONSISTENCY & QUALITY — how this product/service maintains a standard that's hard to keep manually or repeatedly",
  "MENTAL LOAD RELIEF — not just technical, but the calm/peace of not having to think about it anymore",
  "COST/RESOURCE SAVINGS vs the old way or alternatives",
  "NEW OPPORTUNITIES opened — what becomes possible AFTER using this product/service that wasn't before",
  "PROFESSIONAL/CREDIBLE IMPRESSION — how this product makes the customer's business look more polished/trustworthy",
  "LONG-TERM SUSTAINABILITY — a solution for a problem that KEEPS coming back, not just a one-time moment",
  "FLEXIBILITY/ADAPTABILITY — how this product adjusts to the customer's changing situations",
  "SAFETY/PEACE OF MIND — reducing risks of mistakes, losses, or bad outcomes that could happen without this product",
  "EASE OF STARTING — removing early friction/complexity that usually makes people hesitate or delay",
  "SCALE/GROWTH — how this product helps the customer's business grow bigger, not just survive",
  "PERSONALIZATION — outcomes that feel tailor-made for the customer, not generic solutions",
  "CONTROL/AUTONOMY — the customer gains more control over something they used to depend on others for",
  "COMMUNITY/CONNECTION — how this product connects the customer with like-minded people",
  "INSTANT vs LONG-TERM PAYOFF — contrast immediate benefits with those felt later",
  "AVOIDING FOMO/BEING LEFT BEHIND — how this product keeps the customer relevant/not lagging trends or competitors",
  "SIMPLICITY — turning something previously complex/multi-step into one simple step",
  "CONFIDENCE — how using this product makes the customer more certain when deciding or showing up in front of others",
  "HIDDEN VALUE — a side benefit that people rarely notice at first",
  "BEFORE/AFTER CONTRAST — paint a clear picture of the customer's life/business before and after this product",
];

/**
 * 100 TOPIK KONTEN dalam 14 kategori — perbaikan keluhan "judul terlalu mirip
 * & tidak ada pembahasan baru". Rotasi 2 TINGKAT: pilih KATEGORI dulu, baru
 * topik di dalamnya — mencegah topik sejenis muncul beruntun. Kategori
 * "ANGKA JUJUR" = satu-satunya tempat angka dianjurkan, dan HANYA angka
 * nyata dari data profil (aturan kejujuran tetap berlaku).
 */
type TopicCategory = { name: string; topics: string[] };

const TOPIC_CATEGORIES_ID: TopicCategory[] = [
  { name: "EDUKASI DASAR", topics: [
    "cara pakai yang benar (banyak yang keliru)",
    "cara menyimpan/merawat supaya awet",
    "mitos vs fakta di industri ini — luruskan dengan santai",
    "istilah teknis yang bikin bingung, dijelaskan bahasa sehari-hari",
    "perbedaan varian/jenis dan kapan pakai yang mana",
    "hal kecil yang tak disadari orang tapi berpengaruh besar",
    "pertanyaan yang paling sering ditanyakan calon pembeli (FAQ)",
    "kesalahan umum pembeli pemula dan cara menghindarinya",
  ]},
  { name: "EDUKASI LANJUTAN", topics: [
    "kenapa harga produk sejenis bisa beda jauh",
    "apa yang terjadi kalau pakai produk kualitas buruk",
    "cara kerja produk/proses ini yang orang jarang tahu",
    "arti standar/sertifikasi di industri ini untuk pembeli",
    "bahan/material: mana yang bagus, mana yang asal murah",
    "umur pakai wajar produk ini & tanda sudah waktunya ganti",
    "kombinasi produk yang sering dipakai bareng & kenapa cocok",
  ]},
  { name: "CERITA PEMILIK", topics: [
    "asal-usul usaha — kenapa/bagaimana dimulai",
    "kesalahan yang pernah dilakukan pemilik sendiri & pelajarannya",
    "hari terberat menjalankan usaha dan cara melewatinya",
    "keputusan tersulit yang pernah diambil untuk usaha ini",
    "hal yang hampir bikin menyerah, dan kenapa bertahan",
    "pencapaian kecil yang bermakna besar",
    "kebiasaan harian pemilik dalam menjalankan usaha",
    "hal yang dikorbankan demi usaha ini",
  ]},
  { name: "DI BALIK LAYAR", topics: [
    "proses produksi/penyiapan yang tak terlihat pelanggan",
    "alat/barang andalan operasional sehari-hari",
    "dulu vs sekarang — perubahan produk, tempat, atau cara kerja",
    "satu hari di usaha ini (rutinitas dari buka sampai tutup)",
    "bagian pekerjaan yang paling disukai & paling berat",
    "cara menjaga kualitas tetap konsisten setiap hari",
    "apa yang terjadi saat ada produk gagal/tidak lolos standar",
  ]},
  { name: "SUDUT PELANGGAN", topics: [
    "cara pakai tak terduga yang dilakukan pelanggan",
    "tipe-tipe pembeli yang relatable (ringan, tanpa menyindir)",
    "momen spesifik pelanggan paling butuh produk ini",
    "apa yang berubah di keseharian pelanggan setelah pakai",
    "hal yang dikira mahal/ribet padahal tidak",
    "pertanyaan pelanggan yang paling berkesan",
    "kesalahpahaman pelanggan yang sering terjadi",
    "cerita/momen keseharian target pelanggan yang berhubungan dengan produk",
  ]},
  { name: "OPINI & SIKAP", topics: [
    "pendapat jujur pemilik tentang tren di industrinya",
    "hal yang menurut pemilik dilakukan salah oleh industri ini",
    "kenapa usaha ini memilih TIDAK melakukan sesuatu",
    "prinsip yang dipegang walau bikin lebih mahal/lambat",
    "prediksi ringan arah industri ke depan",
    "hal yang overrated & underrated di industri ini",
    "standar pribadi yang lebih tinggi dari standar pasar",
    "tren yang sengaja tidak diikuti & alasannya",
  ]},
  { name: "PRAKTIS & LAYAK DISIMPAN", topics: [
    "checklist singkat sebelum beli produk sejenis (save-worthy)",
    "cara membedakan kualitas bagus vs jelek",
    "tips hemat yang jujur (walau berarti beli lebih jarang)",
    "panduan memilih sesuai kebutuhan/budget",
    "pertanyaan yang wajib ditanyakan ke penjual mana pun",
    "urutan langkah pakai yang benar (step by step)",
    "tanda bahaya (red flag) saat belanja produk sejenis",
    "cara mengecek kondisi/keaslian sebelum bayar",
  ]},
  { name: "PERBANDINGAN", topics: [
    "varian A vs varian B — siapa cocok yang mana (netral)",
    "beli murah sering vs beli bagus sekali — hitungannya",
    "buatan sendiri vs beli jadi — kapan masing-masing masuk akal",
    "produk ini vs alternatif umum (jujur, tanpa menjelekkan)",
    "ukuran kecil vs besar — mana yang lebih untung untuk siapa",
    "baru vs lama — apakah harus selalu yang terbaru",
    "kebutuhan usaha kecil vs besar — bedanya di mana",
  ]},
  { name: "MUSIMAN & MOMEN", topics: [
    "persiapan menjelang hari raya/musim ramai",
    "ide penggunaan saat akhir pekan",
    "momen gajian — prioritas belanja yang masuk akal",
    "cuaca/musim mempengaruhi produk atau kebutuhannya",
    "kilas balik perjalanan usaha sepanjang tahun berjalan",
    "target/rencana ke depan & peran produk di dalamnya",
    "kaitan produk dengan momen keluarga/kumpul bersama",
    "persiapan stok/kebutuhan menjelang tanggal ramai",
  ]},
  { name: "INTERAKTIF RINGAN", topics: [
    "minta pendapat pembaca: pilih A atau B",
    "tebak-tebakan ringan seputar produk/industri (tanpa bocorkan jawaban)",
    "ajak pembaca cerita pengalamannya di komentar",
    "polling ringan kebiasaan pembeli",
    "kalimat isi titik-titik yang dilengkapi pembaca",
    "minta saran untuk produk/layanan berikutnya",
    "apresiasi tulus untuk pelanggan/pengikut",
    "kuis kecil benar-atau-salah seputar industri",
  ]},
  { name: "ANGKA JUJUR DARI DATA SENDIRI", topics: [
    "berapa lama proses menyiapkan satu produk (angka nyata dari data — kalau tak ada datanya, ceritakan prosesnya tanpa angka)",
    "produk terlaris & dugaan alasannya (tanpa mengarang angka penjualan)",
    "berapa banyak pilihan/varian yang tersedia (dari data profil)",
    "sudah berapa lama usaha berjalan & apa artinya untuk pembeli (dari data profil)",
    "jam/waktu tersibuk & tersepi usaha ini",
    "barang yang paling sering ditanyakan tapi jarang dibeli",
  ]},
  { name: "MASALAH & SOLUSI", topics: [
    "masalah umum target pasar & bagaimana produk membantu (tanpa lebay)",
    "masalah yang produk ini TIDAK bisa selesaikan (jujur)",
    "solusi murah sementara vs solusi yang benar",
    "tanda-tanda kamu butuh produk ini (tanpa memaksa)",
    "masalah yang makin besar kalau ditunda",
    "cara mengatasi keluhan paling umum",
    "situasi mendesak yang pernah diselamatkan produk/layanan ini",
  ]},
  { name: "RASA PENASARAN", topics: [
    "hal yang penjual lain jarang mau ceritakan",
    "kebenaran kontra-dugaan (\"yang mahal belum tentu...\")",
    "detail tersembunyi di produk yang jarang diperhatikan orang",
    "kenapa usaha ini BERHENTI melakukan sesuatu",
    "pertanyaan yang bikin mikir — jawabannya dijelaskan di caption",
  ]},
  { name: "NILAI & KEPERCAYAAN", topics: [
    "garansi/jaminan & apa artinya buat pembeli",
    "cara usaha ini menangani komplain (transparan)",
    "kenapa pelanggan balik lagi (tanpa klaim angka)",
    "komitmen ke lingkungan/komunitas lokal (hanya kalau nyata dari data)",
    "apa yang pembeli dapat selain produknya",
  ]},
];

const TOPIC_CATEGORIES_EN: TopicCategory[] = [
  { name: "BASIC EDUCATION", topics: [
    "the right way to use it (many get it wrong)",
    "how to store/care for it so it lasts",
    "myth vs fact in this industry — set it straight casually",
    "confusing technical terms explained in plain language",
    "differences between variants/types and when to use which",
    "small details people miss that matter a lot",
    "the most frequently asked question from potential buyers (FAQ)",
    "common first-time buyer mistakes and how to avoid them",
  ]},
  { name: "ADVANCED EDUCATION", topics: [
    "why prices of similar products vary so much",
    "what happens when you use a poor-quality product",
    "how this product/process actually works (rarely known)",
    "what industry standards/certifications mean for buyers",
    "materials: which are good, which are just cheap",
    "reasonable product lifespan & signs it's time to replace",
    "product combos often used together & why they fit",
  ]},
  { name: "OWNER'S STORY", topics: [
    "origin story — why/how the business started",
    "a mistake the owner made & the lesson learned",
    "the hardest day running the business and getting through it",
    "the toughest decision ever made for this business",
    "what almost made the owner quit, and why they stayed",
    "a small win that meant a lot",
    "the owner's daily habits running the business",
    "what was sacrificed for this business",
  ]},
  { name: "BEHIND THE SCENES", topics: [
    "the production/prep process customers never see",
    "the trusty tools of daily operations",
    "then vs now — how the product, place, or workflow changed",
    "one day at this business (open to close)",
    "the most loved & the hardest part of the job",
    "how quality is kept consistent every day",
    "what happens to products that fail the standard",
  ]},
  { name: "CUSTOMER'S ANGLE", topics: [
    "unexpected ways customers use the product",
    "relatable buyer types (light, never mocking)",
    "the specific moment customers need this most",
    "what changes in customers' daily life after using it",
    "things assumed expensive/complicated that aren't",
    "the most memorable customer question",
    "common customer misunderstandings",
    "a relatable everyday moment of the target customer tied to the product",
  ]},
  { name: "OPINION & STANCE", topics: [
    "the owner's honest take on industry trends",
    "what this industry gets wrong, in the owner's view",
    "why this business chooses NOT to do something",
    "a principle held even when it costs more/slows things down",
    "a light prediction of where the industry is heading",
    "what's overrated & underrated in this industry",
    "personal standards higher than the market's",
    "a trend deliberately not followed & why",
  ]},
  { name: "PRACTICAL & SAVE-WORTHY", topics: [
    "a short checklist before buying this kind of product",
    "how to tell good quality from bad",
    "honest money-saving tips (even if it means buying less often)",
    "a guide to choosing by need/budget",
    "questions to ask any seller (including us)",
    "the correct step-by-step usage order",
    "red flags when shopping for this kind of product",
    "how to check condition/authenticity before paying",
  ]},
  { name: "COMPARISON", topics: [
    "variant A vs variant B — who suits which (neutral)",
    "buying cheap often vs buying good once — the math",
    "DIY vs buying ready-made — when each makes sense",
    "this product vs common alternatives (honest, no trash talk)",
    "small vs large size — which pays off for whom",
    "new vs old — do you always need the latest",
    "small vs big business needs — where they differ",
  ]},
  { name: "SEASONAL & MOMENTS", topics: [
    "preparing for holidays/busy season",
    "weekend usage ideas",
    "payday moment — sensible spending priorities",
    "how weather/season affects the product or the need for it",
    "a look back at the business's year so far",
    "plans ahead & the product's role in them",
    "the product's tie to family/gathering moments",
    "stocking up ahead of busy dates",
  ]},
  { name: "LIGHT INTERACTIVE", topics: [
    "ask readers: pick A or B",
    "a light guessing game about the product/industry (don't reveal the answer)",
    "invite readers to share their experience in the comments",
    "a light poll about buyer habits",
    "a fill-in-the-blank sentence for readers to complete",
    "ask for suggestions for the next product/service",
    "genuine appreciation for customers/followers",
    "a small true-or-false quiz about the industry",
  ]},
  { name: "HONEST NUMBERS FROM OWN DATA", topics: [
    "how long it takes to prepare one product (real number from data — if none, describe the process without numbers)",
    "the best-seller & the likely reason (no invented sales figures)",
    "how many options/variants are available (from profile data)",
    "how long the business has run & what that means for buyers (from profile data)",
    "the busiest & quietest hours of this business",
    "the most-asked-about but rarely-bought item",
  ]},
  { name: "PROBLEM & SOLUTION", topics: [
    "a common audience problem & how the product helps (no hype)",
    "problems this product can NOT solve (honest)",
    "cheap temporary fix vs the proper solution",
    "signs you might need this product (no pressure)",
    "problems that grow when postponed",
    "how to handle the most common complaint",
    "an urgent situation this product/service once saved",
  ]},
  { name: "CURIOSITY", topics: [
    "what other sellers rarely want to tell you",
    "a counter-intuitive truth (\"expensive doesn't always mean...\")",
    "a hidden detail in the product people rarely notice",
    "why this business STOPPED doing something",
    "a thought-provoking question — answered in the caption",
  ]},
  { name: "VALUE & TRUST", topics: [
    "warranty/guarantee & what it means for buyers",
    "how this business handles complaints (transparent)",
    "why customers come back (no numeric claims)",
    "commitment to the local community/environment (only if real, from data)",
    "what buyers get beyond the product itself",
  ]},
];

/**
 * Arah konten per generate — pengganti pickPerspectiveNote lama:
 * 40% sudut MANFAAT (nuansa jualan halus, pool PERSPECTIVE_ANGLES),
 * 60% TOPIK dari 100 pembahasan (rotasi 2 tingkat: kategori dulu, baru
 * topik) — supaya feed tidak terasa "jualan terus dengan kata-kata diganti"
 * dan pembahasan benar-benar meluas.
 */
function pickContentDirection(lang?: Lang): string {
  if (Math.random() < 0.4) {
    const arr = isEn(lang) ? PERSPECTIVE_ANGLES_EN : PERSPECTIVE_ANGLES_ID;
    const angle = arr[Math.floor(Math.random() * arr.length)];
    if (isEn(lang)) {
      return `IMPORTANT perspective note: The "Customer problem being solved" in the profile above is ONLY ONE angle, NOT the only one you're allowed to explore. For this content, explore a DIFFERENT benefit perspective below — stay consistent with the product/industry/target audience, BUT don't just repeat the problem sentence already stated: ${angle}.`;
    }
    return `CATATAN PENTING soal sudut pandang: "Masalah pelanggan yang diselesaikan" di profil di atas cuma SATU CONTOH, BUKAN satu-satunya sudut yang boleh dibahas. Untuk konten kali ini, eksplorasi perspektif manfaat BERBEDA berikut — tetap konsisten & masuk akal dengan produk/industri/target pelanggan di atas, TAPI jangan cuma mengulang kalimat masalah yang sudah tertulis: ${angle}.`;
  }
  const cats = isEn(lang) ? TOPIC_CATEGORIES_EN : TOPIC_CATEGORIES_ID;
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
  if (isEn(lang)) {
    return `IMPORTANT topic note: For THIS content, cover the following topic (category ${cat.name}): ${topic}. The topic is the MAIN focus — the product/business appears as context, not a hard sell; one subtle CTA at the end of the caption is still fine. Do NOT recycle the "customer problem" from the profile as the main theme. Dig into ONE specific angle of this topic — don't write a generic take that fits any business. If this topic truly makes no sense for this business, pick the closest fitting angle from the SAME category instead.`;
  }
  return `CATATAN PENTING soal topik: Untuk konten KALI INI bahas topik berikut (kategori ${cat.name}): ${topic}. Topik = fokus UTAMA — produk/usaha muncul sebagai konteks, bukan promosi keras; satu CTA halus di akhir caption tetap boleh. JANGAN mendaur ulang "masalah pelanggan" dari profil sebagai tema utama. Gali SATU sudut spesifik dari topik ini — jangan tulis versi generik yang cocok untuk usaha mana pun. Kalau topik ini benar-benar tidak masuk akal untuk usaha ini, pilih sudut terdekat yang cocok dari kategori yang SAMA.`;
}

const WRITING_STYLES_ID = [
  "storytelling singkat (buka dengan potongan cerita/momen kecil)",
  "to-the-point & lugas (langsung ke inti, kalimat pendek-pendek)",
  "hangat & personal (seolah bicara ke satu orang, bukan ke banyak orang)",
  "reflektif & menyentuh (mengajak pembaca merenung sejenak)",
  "playful & ringan (sedikit jenaka, tidak kaku)",
  "informatif dengan satu fakta BENAR dari data profil di awal (tanpa mengarang angka/riset)",
];

const WRITING_STYLES_EN = [
  "short storytelling (open with a small story/moment fragment)",
  "to-the-point & direct (get to the core immediately, short sentences)",
  "warm & personal (as if speaking to one person, not a crowd)",
  "reflective & touching (invite the reader to pause and think)",
  "playful & light (a bit witty, not stiff)",
  "informative with one TRUE fact from the profile data in the opening (no invented numbers/research)",
];

function pickWritingStyle(lang?: Lang): string {
  const arr = isEn(lang) ? WRITING_STYLES_EN : WRITING_STYLES_ID;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Interaksi rules ────────────────────────────────────────────────────────
const ONIMAGE_RULE_INTERAKSI_ID =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): PERTANYAAN atau hook yang memancing " +
  "keterlibatan, SESUAIKAN dengan format terpilih " +
  '(mis. kuis: "Tebak isinya apa?"; edukasi: "Tahukah kamu ini?"; tips: "Sering keliru soal ini?"; pilih A/B: "Kamu tim yang mana?").';

const ONIMAGE_RULE_INTERAKSI_EN =
  "onImageText = short text ON the image (max 8 words): a QUESTION or hook that invites engagement, " +
  "MATCHING the chosen format " +
  '(e.g. quiz: "Can you guess what\'s inside?"; education: "Did you know?"; tips: "Are you doing this wrong?"; A/B pick: "Which team are you?").';

function onImageRuleInteraksi(lang?: Lang): string {
  return isEn(lang) ? ONIMAGE_RULE_INTERAKSI_EN : ONIMAGE_RULE_INTERAKSI_ID;
}

const INTERAKSI_CAPTION_RULES_ID =
  "caption = caption Instagram yang MEMANCING INTERAKSI (BUKAN jualan/penjelasan searah), Bahasa Indonesia:\n" +
  "- Pakai bahasa sehari-hari yang SEDERHANA & gampang dimengerti: kalimat pendek, kata umum, hindari istilah rumit/kaku/berbunga-bunga. Bayangkan ngobrol santai dengan teman.\n" +
  "- WAJIB berisi, berurutan: (1) hook relatable dari keseharian pembaca di kalimat pertama; " +
  "(2) SATU pertanyaan langsung ke pembaca; (3) ajakan berinteraksi yang JELAS — mis. 'komen di bawah', " +
  "'tulis pendapatmu', 'tag temanmu', 'simpan dulu', atau 'pilih A atau B'.\n" +
  "- DILARANG berbentuk paragraf promosi atau penjelasan fitur/produk satu arah. Fokus = percakapan, bukan iklan.\n" +
  "- Kalau formatnya kuis/poll: sertakan pilihan (mis. A/B atau opsi) dan JANGAN bocorkan jawaban.\n" +
  "- Nada ngobrol & hangat, boleh sedikit emoji. Variasikan pembuka SETIAP kali; HINDARI klise " +
  '("Pernah nggak sih", "Tenang saja", "Dijamin", "bosku", "gaskeun").\n' +
  "- 2-4 kalimat, DIAKHIRI ajakan interaksi lalu WAJIB 3-6 hashtag relevan (format #katakunci). SEMUA hashtag WAJIB berbahasa Indonesia. JANGAN PERNAH mengosongkan hashtag. Patuhi nada brand & hindari topik terlarang.\n" +
  'CONTOH GAYA (jangan disalin persis; SESUAIKAN dengan format terpilih): ' +
  '(kuis) "Coba tebak, menu andalan kami pakai bahan rahasia apa? 🤔 Tulis tebakanmu di komen ya! #..." | ' +
  '(tips) "Simpan dulu: 1 trik biar produkmu awet. Kamu biasanya gimana? Cerita dong 👇 #..."';

const INTERAKSI_CAPTION_RULES_EN =
  "caption = an Instagram caption designed to INVITE INTERACTION (NOT one-way selling/explanation), in English:\n" +
  "- Use SIMPLE, everyday language: short sentences, common words, avoid stiff/flowery/corporate terms. Picture a casual chat with a friend.\n" +
  "- MUST contain, in order: (1) a relatable hook from the reader's day-to-day in the first sentence; " +
  "(2) ONE direct question to the reader; (3) a CLEAR interaction invitation — e.g. 'comment below', " +
  "'share your thoughts', 'tag a friend', 'save this for later', or 'pick A or B'.\n" +
  "- DON'T write a promo paragraph or one-way feature/product explanation. Focus = conversation, not ad.\n" +
  "- If it's a quiz/poll: include the choices (e.g. A/B or options) and DON'T reveal the answer.\n" +
  "- Warm, chatty tone; a bit of emoji is fine. Vary openings EVERY time; AVOID clichés " +
  '("Ever wondered", "You know that feeling", "Let\'s dive in", "Guess what", "Fun fact", "Real talk").\n' +
  "- 2-4 sentences, ENDING with an interaction invite, then MUST have 3-6 relevant hashtags (format #keyword). ALL hashtags MUST be in English. NEVER omit hashtags. Match brand voice & avoid restricted topics.\n" +
  'STYLE EXAMPLES (don\'t copy verbatim; MATCH the chosen format): ' +
  '(quiz) "Bet you can\'t guess the secret ingredient in our bestseller 🤔 Drop your guess below! #..." | ' +
  '(tips) "Save this: one trick to make your product last longer. What\'s your go-to? 👇 #..."';

function interaksiCaptionRules(lang?: Lang): string {
  return (isEn(lang) ? INTERAKSI_CAPTION_RULES_EN : INTERAKSI_CAPTION_RULES_ID) + "\n" + qualityRules(lang);
}

// ── Interaksi formats ──────────────────────────────────────────────────────
type InteraksiFormat = { label: string; brief: string; scene: string };

const INTERAKSI_FORMATS_ID: InteraksiFormat[] = [
  {
    label: "KUIS / TEBAK-TEBAKAN",
    brief:
      "buat pertanyaan tebak-tebakan ringan seputar produk, bahan, proses, atau kebiasaan target pasar. " +
      "JANGAN bocorkan jawabannya — minta pembaca menebak di komentar.",
    scene:
      "SATU adegan utuh (BUKAN split kiri-kanan) yang memberi PETUNJUK visual terhadap tebakan tanpa membocorkan jawaban.",
  },
  {
    label: "EDUKASI / TAHUKAH KAMU",
    brief:
      "bagikan SATU fakta atau insight menarik & benar seputar produk/industri bisnis ini (gaya 'Tahukah kamu...'), " +
      "lalu tetap interaktif dengan menanyakan pendapat atau pengalaman pembaca.",
    scene:
      "SATU adegan tunggal (BUKAN split kiri-kanan) yang mengilustrasikan fakta/topik itu dengan jelas.",
  },
  {
    label: "TIPS PRAKTIS",
    brief:
      "beri SATU tips singkat & bisa langsung dipakai, relevan dengan produk & target pasar, " +
      "lalu ajak pembaca berbagi tips atau pengalaman mereka.",
    scene:
      "SATU adegan (BUKAN split kiri-kanan) yang menunjukkan tips itu sedang dipraktikkan.",
  },
  {
    label: "PILIH A ATAU B (this-or-that / perbandingan)",
    brief:
      "tawarkan DUA opsi relatable yang bikin pembaca memilih salah satu (mis. 'Tim A atau Tim B?').",
    scene:
      "komposisi SPLIT kiri-kanan menampilkan dua opsi yang dibandingkan; " +
      "PENTING kedua sisi HARUS mengisi penuh tinggi bingkai dari ATAS sampai BAWAH — jangan sisakan ruang kosong di bagian atas.",
  },
  {
    label: "ISI TITIK-TITIK",
    brief:
      "buat kalimat yang harus dilanjutkan pembaca (mis. 'Hari paling semangat kalau udah ___'), ajak mereka melengkapinya di komentar.",
    scene:
      "SATU adegan keseharian target pasar (BUKAN split kiri-kanan) yang mendukung kalimat itu.",
  },
  {
    label: "RATING / SKALA",
    brief:
      "minta pembaca memberi skala atas sesuatu (mis. 'Dari 1-10, seberapa...').",
    scene:
      "SATU adegan (BUKAN split kiri-kanan) yang mewakili tema atau perasaan itu.",
  },
];

const INTERAKSI_FORMATS_EN: InteraksiFormat[] = [
  {
    label: "QUIZ / GUESS",
    brief:
      "make a light guess-question about the product, ingredients, process, or target audience habits. " +
      "DON'T reveal the answer — invite readers to guess in the comments.",
    scene:
      "ONE whole scene (NOT left-right split) that gives a visual CLUE to the guess without giving the answer away.",
  },
  {
    label: "EDUCATION / DID YOU KNOW",
    brief:
      "share ONE interesting & true fact or insight about this product/industry (style: 'Did you know...'), " +
      "then stay interactive by asking the reader's opinion or experience.",
    scene:
      "ONE single scene (NOT left-right split) that clearly illustrates the fact/topic.",
  },
  {
    label: "PRACTICAL TIP",
    brief:
      "give ONE short, immediately usable tip relevant to the product & target audience, " +
      "then invite readers to share their own tips or experience.",
    scene:
      "ONE scene (NOT left-right split) showing the tip being applied.",
  },
  {
    label: "PICK A OR B (this-or-that / comparison)",
    brief:
      "offer TWO relatable options that make readers pick one (e.g. 'Team A or Team B?').",
    scene:
      "LEFT-RIGHT SPLIT composition showing the two options being compared; " +
      "IMPORTANT both sides MUST fill the full frame height from TOP to BOTTOM — don't leave empty space at the top.",
  },
  {
    label: "FILL IN THE BLANK",
    brief:
      "write a sentence readers should complete (e.g. 'The best part of my day is when ___'), invite them to finish it in the comments.",
    scene:
      "ONE day-to-day scene of the target audience (NOT left-right split) that supports the sentence.",
  },
  {
    label: "RATING / SCALE",
    brief:
      "ask readers to rate something (e.g. 'On a scale of 1-10, how...').",
    scene:
      "ONE scene (NOT left-right split) that represents the theme or feeling.",
  },
];

function pickInteraksiFormat(lang?: Lang): InteraksiFormat {
  const arr = isEn(lang) ? INTERAKSI_FORMATS_EN : INTERAKSI_FORMATS_ID;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Font & JSON tail ───────────────────────────────────────────────────────
function fontRule(lang?: Lang): string {
  if (isEn(lang)) {
    return `fontId = pick ONE font ID from this list that BEST matches the mood and style of this content (consider industry, brand voice, and target customer): ${FONT_LIST}. ` +
      "E.g. elegant business → serif/display; playful/youth → script/rounded sans; bold/strong → condensed/display. Don't always pick the same one.";
  }
  return `fontId = pilih SATU font ID dari daftar berikut yang PALING COCOK dengan suasana dan gaya konten ini (pertimbangkan industri, nada brand, dan target pelanggan): ${FONT_LIST}. ` +
    "Contoh: bisnis elegan → serif/display; playful/anak muda → script/sans bulat; bold/tegas → condensed/display. Jangan selalu pilih yang sama.";
}

function jsonTail(lang?: Lang): string {
  return isEn(lang)
    ? "Reply ONLY with valid JSON, no explanation and no markdown wrapper."
    : "Balas HANYA dengan JSON valid, tanpa penjelasan dan tanpa pembungkus markdown.";
}

/**
 * Blok tambahan opsional dari route (anti-repetisi, kalender momen, dst).
 * Disisipkan menjelang akhir prompt, sebelum instruksi "balas hanya JSON".
 */
function extraBlocks(extra?: string): string {
  return extra && extra.trim() ? `${extra.trim()}\n` : "";
}


// ═══════════════════════════════════════════════════════════════════════════
// BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

export function buildProdukContentPrompt(profile: BusinessProfile, productDescription: string, lang?: Lang, extra?: string): string {
  if (isEn(lang)) {
    return `${persona(lang)}
${outputLangDirective(lang)}
Create promotional content for ONE product, in English. The product = MAIN STAR.

${profileBlock(profile, lang)}

Product: ${productDescription || "(no description)"}

${pickContentDirection(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngleForProduk(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
  }

  return `${persona(lang)}
${outputLangDirective(lang)}
Buat konten promosi SATU produk, dalam Bahasa Indonesia. Produk = BINTANG UTAMA.

${profileBlock(profile, lang)}

Produk: ${productDescription || "(tidak ada deskripsi)"}

${pickContentDirection(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngleForProduk(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
}

export function buildGeneralContentPrompt(profile: BusinessProfile, lang?: Lang, extra?: string): string {
  if (isEn(lang)) {
    return `${persona(lang)}
${outputLangDirective(lang)}
Create ONE general content piece (NOT a specific product promo) that explains/highlights this business, in English. Stay on the business's topic.

${profileBlock(profile, lang)}

${pickContentDirection(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngle(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
imageScene = one English sentence, a realistic photo scene that reflects the topic/direction note above. Specific, not generic. No text/logo in the scene.
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
  }

  return `${persona(lang)}
${outputLangDirective(lang)}
Buat SATU konten umum (BUKAN promosi produk spesifik) yang menjelaskan/mengangkat usaha ini, dalam Bahasa Indonesia. Tetap pada topik usaha.

${profileBlock(profile, lang)}

${pickContentDirection(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngle(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
imageScene = satu kalimat Bahasa Indonesia, adegan foto realistis yang mencerminkan topik/arah konten di atas. Spesifik, bukan umum. Tanpa teks/logo di adegan.
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
}

export function buildInteraksiContentPrompt(profile: BusinessProfile, lang?: Lang, extra?: string): string {
  const format = pickInteraksiFormat(lang);
  if (isEn(lang)) {
    return `${persona(lang)}
${outputLangDirective(lang)}
Create ONE INTERACTIVE piece of content, in English. MAIN GOAL = invite INTERACTION (comment/save/vote/tag), NOT selling.

${profileBlock(profile, lang)}

CONTENT FORMAT FOR THIS PIECE (MUST use this, DON'T switch to another format): ${format.label}.
Format instruction: ${format.brief}
Design onImageText, caption, AND imageScene so they are COMPACT & consistent with the format above, and truly relevant to the business and its audience.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still consistent with the format & brand voice).

JSON format: {"onImageText": "...", "caption": "...", "jawaban": "...", "imageScene": "...", "fontId": "..."}
${onImageRuleInteraksi(lang)}
${interaksiCaptionRules(lang)}
jawaban = a SHORT note for the BUSINESS OWNER (NOT posted to customers): explain the answer/intent of this content and the points covered, so you understand it & can reply to comments. For QUIZ/GUESS: clearly write the correct answer. Max 1-2 sentences, plain language.
imageScene = 1-2 English sentences. ${format.scene} The scene MUST fill the ENTIRE frame from top to bottom (no empty/blank areas). Illustration, cartoon, or semi-realistic style is fine. Specific & relatable to the audience, not generic. NO text/letters/numbers/logos in the scene.
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
  }

  return `${persona(lang)}
${outputLangDirective(lang)}
Buat SATU konten INTERAKTIF, dalam Bahasa Indonesia. Tujuan UTAMA = memancing INTERAKSI (komentar/simpan/vote/tag), BUKAN jualan.

${profileBlock(profile, lang)}

FORMAT KONTEN KALI INI (WAJIB pakai ini, JANGAN diganti ke format lain): ${format.label}.
Instruksi format: ${format.brief}
Rancang onImageText, caption, DAN imageScene agar KOMPAK & konsisten dengan format di atas, serta benar-benar relevan dengan bisnis dan target pasarnya.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap konsisten dengan format & nada brand).

Format JSON: {"onImageText": "...", "caption": "...", "jawaban": "...", "imageScene": "...", "fontId": "..."}
${onImageRuleInteraksi(lang)}
${interaksiCaptionRules(lang)}
jawaban = penjelasan SINGKAT khusus untuk PEMILIK BISNIS (TIDAK ikut diposting ke pelanggan): jelaskan jawaban/maksud konten ini dan poin yang dibahas, supaya kamu paham isinya & siap membalas komentar. Untuk KUIS/TEBAK: tulis jawaban benarnya dengan jelas. Maksimal 1-2 kalimat, bahasa gampang.
imageScene = 1-2 kalimat Bahasa Indonesia. ${format.scene} Adegan WAJIB mengisi PENUH seluruh bingkai dari atas sampai bawah (tanpa area kosong/polos). Boleh gaya ilustrasi, kartun, atau semi-realistis. Spesifik & relatable ke target pasar, bukan generik. TANPA teks/huruf/angka/logo di dalam adegan.
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
}

export function buildGabungContentPrompt(profile: BusinessProfile, descriptions: string[], lang?: Lang, extra?: string): string {
  if (isEn(lang)) {
    const list = descriptions
      .map((d, i) => `  ${i + 1}. ${d && d.trim() ? d.trim() : "(no description)"}`)
      .join("\n");
    return `${persona(lang)}
${outputLangDirective(lang)}
Create ONE promotional content combining the following ${descriptions.length} products into a single image, in English.

${profileBlock(profile, lang)}

Products being combined (${descriptions.length}):
${list}

IMPORTANT: don't just list products one by one. Find the COMMON THREAD / CORE INSIGHT connecting all these products (e.g. all fit a certain moment, one gift set, one flavor category, solution to the same need), then use that as the headline & caption angle.

${pickContentDirection(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngleForProduk(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
  }

  const list = descriptions
    .map((d, i) => `  ${i + 1}. ${d && d.trim() ? d.trim() : "(tanpa deskripsi)"}`)
    .join("\n");
  return `${persona(lang)}
${outputLangDirective(lang)}
Buat SATU konten promosi yang menggabungkan ${descriptions.length} produk berikut dalam satu gambar, dalam Bahasa Indonesia.

${profileBlock(profile, lang)}

Produk yang digabung (${descriptions.length}):
${list}

PENTING: jangan sekadar menyebut produk satu per satu. Cari BENANG MERAH / INTISARI yang menghubungkan semua produk itu (mis. sama-sama cocok untuk momen tertentu, satu paket/hampers, satu kategori rasa, solusi untuk kebutuhan yang sama), lalu jadikan itu sudut judul & caption.

${pickContentDirection(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngleForProduk(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${extraBlocks(extra)}${jsonTail(lang)}`;
}
