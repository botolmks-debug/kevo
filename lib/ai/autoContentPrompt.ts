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
  "- PILIH salah satu gaya pembuka SEGAR ini (rotasi, JANGAN pakai gaya yang sama di dua caption berurutan): (1) fragmen momen keseharian (\"Jam 11 malam. Mesin masih nyala. Kamu belum tidur.\"), (2) pengakuan jujur (\"Aku hampir menyerah bulan lalu\"), (3) statement kontroversial (\"Followers banyak bukan berarti laris\"), (4) angka data spesifik (\"Dari 100 pengusaha, 87 mengaku pusing bikin konten\"), (5) sudut pandang orang ketiga (\"Kata teman aku, katanya...\"), (6) langsung ke inti tanpa basa-basi (\"Ini masalahnya. Ini solusinya.\").\n" +
  "- Gunakan perumpamaan/analogi yang relevan.\n" +
  "- Sentuh PERASAAN pembaca: tunjukkan empati terhadap apa yang mereka rasakan, khawatirkan, atau impikan.\n" +
  "- Boleh dari sudut pandang pembaca (\"aku/kita\"), menyuarakan keseharian mereka.\n" +
  "- Isi 2-4 kalimat, satu CTA halus, lalu WAJIB diakhiri 3-6 hashtag relevan (format #katakunci tanpa spasi di dalam tag). SEMUA hashtag WAJIB berbahasa Indonesia (samakan dengan bahasa caption). JANGAN PERNAH mengosongkan hashtag. Patuhi nada brand & hindari topik terlarang.";

const CAPTION_RULES_EN =
  "caption = a LIVING, empathetic Instagram caption, in English:\n" +
  "- Vary the opening style EVERY time. AVOID clichés: \"Elevate your\", \"Look no further\", \"In today's fast-paced world\", \"Take your X to the next level\", \"Game changer\", \"Ever wondered\", \"You know that feeling\", \"We've got you covered\", \"Let's dive in\". Don't repeat the same words or openings.\n" +
  "- Use relevant metaphors/analogies that feel human, not corporate.\n" +
  "- Touch the reader's EMOTIONS: show empathy for what they feel, worry about, or dream of.\n" +
  "- Reader-first perspective is welcome (\"I/we\"), voicing their day-to-day.\n" +
  "- 2-4 sentences, one subtle CTA, then MUST end with 3-6 relevant hashtags (format #keyword, no spaces inside the tag). ALL hashtags MUST be in English (match the caption's language) — never mix Indonesian hashtags into English captions, even for local audiences (use transliterated versions like #makassarbusiness instead of #makassarbisnis). NEVER omit hashtags. Match brand voice & avoid restricted topics.";

function captionRules(lang?: Lang): string {
  return isEn(lang) ? CAPTION_RULES_EN : CAPTION_RULES_ID;
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
  "sudut ANGKA / hasil konkret",
  "sudut MASALAH yang dirasakan lalu solusinya",
  "sudut EMOSI / momen relatable keseharian",
  "sudut AJAKAN atau urgensi yang halus",
  "sudut KEUNIKAN / hal yang beda dari produk ini",
];

const HEADLINE_ANGLES_EN = [
  "MAIN BENEFIT angle (what's in it for the buyer)",
  "curiosity-driven QUESTION angle",
  "NUMBER / concrete result angle",
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

function pickPerspectiveNote(lang?: Lang): string {
  const arr = isEn(lang) ? PERSPECTIVE_ANGLES_EN : PERSPECTIVE_ANGLES_ID;
  const angle = arr[Math.floor(Math.random() * arr.length)];
  if (isEn(lang)) {
    return `IMPORTANT perspective note: The "Customer problem being solved" in the profile above is ONLY ONE angle, NOT the only one you're allowed to explore. For this content, explore a DIFFERENT benefit perspective below — stay consistent with the product/industry/target audience, BUT don't just repeat the problem sentence already stated: ${angle}.`;
  }
  return `CATATAN PENTING soal sudut pandang: "Masalah pelanggan yang diselesaikan" di profil di atas cuma SATU CONTOH, BUKAN satu-satunya sudut yang boleh dibahas. Untuk konten kali ini, eksplorasi perspektif manfaat BERBEDA berikut — tetap konsisten & masuk akal dengan produk/industri/target pelanggan di atas, TAPI jangan cuma mengulang kalimat masalah yang sudah tertulis: ${angle}.`;
}

const TOPIC_ANGLES_GENERAL_ID = [
  "EDUKASI seputar produk/industri — satu fakta atau insight yang berguna buat target pasar",
  "CERITA ASAL-USUL (origin story) — kenapa/bagaimana usaha ini dimulai atau nilai yang dipegang",
  "MANFAAT SPESIFIK — satu keuntungan konkret yang dirasakan pelanggan, bukan klaim umum",
  "MOMEN KESEHARIAN pelanggan yang berkaitan dengan usaha ini — bikin pembaca merasa terwakili",
  "TIPS PRAKTIS yang relevan dengan industri usaha ini, bisa langsung dipakai pembaca",
  "MITOS vs FAKTA seputar industri/produk ini — luruskan kesalahpahaman umum",
  "DI BALIK LAYAR — proses, dedikasi, atau detail kerja yang biasanya tidak terlihat pelanggan",
  "SEBELUM vs SESUDAH — perubahan/hasil yang dirasakan setelah pakai produk/layanan ini",
];

const TOPIC_ANGLES_GENERAL_EN = [
  "EDUCATION about the product/industry — one fact or insight useful to the target audience",
  "ORIGIN STORY — why/how this business started or the values it holds",
  "SPECIFIC BENEFIT — one concrete gain customers feel, not a generic claim",
  "CUSTOMER DAY-TO-DAY MOMENT related to this business — makes the reader feel represented",
  "PRACTICAL TIP relevant to this industry, immediately usable by the reader",
  "MYTH vs FACT about this industry/product — correct a common misconception",
  "BEHIND THE SCENES — process, dedication, or work details customers usually don't see",
  "BEFORE vs AFTER — the change/result felt after using this product/service",
];

function pickTopicAngleGeneral(lang?: Lang): string {
  const arr = isEn(lang) ? TOPIC_ANGLES_GENERAL_EN : TOPIC_ANGLES_GENERAL_ID;
  return arr[Math.floor(Math.random() * arr.length)];
}

const WRITING_STYLES_ID = [
  "storytelling singkat (buka dengan potongan cerita/momen kecil)",
  "to-the-point & lugas (langsung ke inti, kalimat pendek-pendek)",
  "hangat & personal (seolah bicara ke satu orang, bukan ke banyak orang)",
  "reflektif & menyentuh (mengajak pembaca merenung sejenak)",
  "playful & ringan (sedikit jenaka, tidak kaku)",
  "informatif dengan satu fakta/angka kecil di awal",
];

const WRITING_STYLES_EN = [
  "short storytelling (open with a small story/moment fragment)",
  "to-the-point & direct (get to the core immediately, short sentences)",
  "warm & personal (as if speaking to one person, not a crowd)",
  "reflective & touching (invite the reader to pause and think)",
  "playful & light (a bit witty, not stiff)",
  "informative with one small fact/number in the opening",
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
  return isEn(lang) ? INTERAKSI_CAPTION_RULES_EN : INTERAKSI_CAPTION_RULES_ID;
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

// ═══════════════════════════════════════════════════════════════════════════
// BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

export function buildProdukContentPrompt(profile: BusinessProfile, productDescription: string, lang?: Lang): string {
  if (isEn(lang)) {
    return `${persona(lang)}
${outputLangDirective(lang)}
Create promotional content for ONE product, in English. The product = MAIN STAR.

${profileBlock(profile, lang)}

Product: ${productDescription || "(no description)"}

${pickPerspectiveNote(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngleForProduk(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;
  }

  return `${persona(lang)}
${outputLangDirective(lang)}
Buat konten promosi SATU produk, dalam Bahasa Indonesia. Produk = BINTANG UTAMA.

${profileBlock(profile, lang)}

Produk: ${productDescription || "(tidak ada deskripsi)"}

${pickPerspectiveNote(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngleForProduk(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;
}

export function buildGeneralContentPrompt(profile: BusinessProfile, lang?: Lang): string {
  const topic = pickTopicAngleGeneral(lang);
  if (isEn(lang)) {
    return `${persona(lang)}
${outputLangDirective(lang)}
Create ONE general content piece (NOT a specific product promo) that explains/highlights this business, in English. Stay on the business's topic.

${profileBlock(profile, lang)}

CONTENT TOPIC FOR THIS PIECE (MUST use this, DON'T switch to another topic): ${topic}.

${pickPerspectiveNote(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngle(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
imageScene = one English sentence, a realistic photo scene that reflects the TOPIC above. Specific, not generic. No text/logo in the scene.
${fontRule(lang)}
${jsonTail(lang)}`;
  }

  return `${persona(lang)}
${outputLangDirective(lang)}
Buat SATU konten umum (BUKAN promosi produk spesifik) yang menjelaskan/mengangkat usaha ini, dalam Bahasa Indonesia. Tetap pada topik usaha.

${profileBlock(profile, lang)}

TOPIK KONTEN KALI INI (WAJIB pakai ini, JANGAN diganti ke topik lain): ${topic}.

${pickPerspectiveNote(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngle(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
imageScene = satu kalimat Bahasa Indonesia, adegan foto realistis yang mencerminkan TOPIK di atas. Spesifik, bukan umum. Tanpa teks/logo di adegan.
${fontRule(lang)}
${jsonTail(lang)}`;
}

export function buildInteraksiContentPrompt(profile: BusinessProfile, lang?: Lang): string {
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
${jsonTail(lang)}`;
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
${jsonTail(lang)}`;
}

export function buildGabungContentPrompt(profile: BusinessProfile, descriptions: string[], lang?: Lang): string {
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

${pickPerspectiveNote(lang)}

For the HEADLINE (onImageText) this time, use ${pickHeadlineAngleForProduk(lang)}. Craft a FRESH new phrase; don't repeat commonly used titles.
For the caption WRITING STYLE this time, use: ${pickWritingStyle(lang)} (still within the brand voice defined above).

JSON format: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;
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

${pickPerspectiveNote(lang)}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngleForProduk(lang)}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle(lang)} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${onImageRule(lang)}
${captionRules(lang)}
${fontRule(lang)}
${jsonTail(lang)}`;
}
