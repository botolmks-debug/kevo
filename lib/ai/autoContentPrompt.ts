import { outputLangDirective, type Lang } from "@/lib/ai/lang";
import type { BusinessProfile, ContentGoal } from "@/lib/onboarding/businessProfile";
import { FONT_OPTIONS } from "@/lib/templates/fonts";

const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  jualan: "jualan/penjualan",
  brand_awareness: "brand awareness",
  edukasi: "edukasi",
  loyalitas_pelanggan: "loyalitas pelanggan",
};

function profileBlock(profile: BusinessProfile): string {
  const goals =
    profile.positioning.contentGoals.map((goal) => CONTENT_GOAL_LABELS[goal] ?? goal).join(", ") || "-";

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

// Daftar font yang tersedia — AI diminta memilih yang paling cocok.
const FONT_LIST = FONT_OPTIONS.map((f) => `${f.id} (${f.style})`).join(", ");

const PERSONA =
  "Kamu adalah gabungan ahli desain visual, ahli komunikasi marketing, dan content strategist untuk UMKM. " +
  "Rangkai data profil menjadi konten SPESIFIK, relevan, dan sesuai gaya brand. " +
  "TERPENTING: tulislah seolah KAMU sendiri adalah target pasarnya — kamu tahu persis apa yang mereka rasakan, " +
  "keluhkan, takutkan, dan impikan setiap hari. Bangun empati yang tulus sampai pembaca merasa \"ini gue banget\" / " +
  "\"kok ngerti banget sih\". Menulislah dari DALAM perasaan mereka, bukan dari luar sebagai penjual.";

const CAPTION_RULES =
  "caption = caption Instagram yang HIDUP dan berempati, dalam Bahasa Indonesia:\n" +
  "- Variasikan gaya pembuka SETIAP kali. HINDARI klise: \"Pernah nggak sih\", \"Bikin panik\", \"Tenang saja\", \"Dijamin\", \"bosku\", \"gaskeun\". Jangan mengulang kata yang sama.\n" +
  "- Gunakan perumpamaan/analogi yang relevan.\n" +
  "- Sentuh PERASAAN pembaca: tunjukkan empati terhadap apa yang mereka rasakan, khawatirkan, atau impikan.\n" +
  "- Boleh dari sudut pandang pembaca (\"aku/kita\"), menyuarakan keseharian mereka.\n" +
  "- Isi 2-4 kalimat, satu CTA halus, lalu WAJIB diakhiri 3-6 hashtag relevan (format #katakunci tanpa spasi di dalam tag). JANGAN PERNAH mengosongkan hashtag. Patuhi nada brand & hindari topik terlarang.";

const ONIMAGE_RULE =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): headline menarik, segar, tidak klise. " +
  "VARIASIKAN gaya & pilihan kata SETIAP kali — JANGAN mengulang frasa/judul yang sama atau mirip yang sudah umum dipakai.";

// Sudut headline yang diacak tiap generate supaya judul tidak monoton/berulang.
const HEADLINE_ANGLES = [
  "sudut MANFAAT utama (apa untungnya buat pembeli)",
  "sudut PERTANYAAN yang bikin penasaran",
  "sudut ANGKA / hasil konkret",
  "sudut MASALAH yang dirasakan lalu solusinya",
  "sudut EMOSI / momen relatable keseharian",
  "sudut AJAKAN atau urgensi yang halus",
  "sudut KEUNIKAN / hal yang beda dari produk ini",
];

function pickHeadlineAngle(): string {
  return HEADLINE_ANGLES[Math.floor(Math.random() * HEADLINE_ANGLES.length)];
}

// Topik General dipilih DI KODE (bukan diserahkan ke AI) — sebelumnya General
// cuma dikasih hint longgar ("boleh edukasi/manfaat/cerita") tanpa dipaksa,
// jadi AI cenderung jatuh ke pola yang sama tiap kali. Sekarang topiknya
// benar-benar dirotasi seperti INTERAKSI_FORMATS di bawah.
const TOPIC_ANGLES_GENERAL = [
  "EDUKASI seputar produk/industri — satu fakta atau insight yang berguna buat target pasar",
  "CERITA ASAL-USUL (origin story) — kenapa/bagaimana usaha ini dimulai atau nilai yang dipegang",
  "MANFAAT SPESIFIK — satu keuntungan konkret yang dirasakan pelanggan, bukan klaim umum",
  "MOMEN KESEHARIAN pelanggan yang berkaitan dengan usaha ini — bikin pembaca merasa terwakili",
  "TIPS PRAKTIS yang relevan dengan industri usaha ini, bisa langsung dipakai pembaca",
  "MITOS vs FAKTA seputar industri/produk ini — luruskan kesalahpahaman umum",
  "DI BALIK LAYAR — proses, dedikasi, atau detail kerja yang biasanya tidak terlihat pelanggan",
  "SEBELUM vs SESUDAH — perubahan/hasil yang dirasakan setelah pakai produk/layanan ini",
];

function pickTopicAngleGeneral(): string {
  return TOPIC_ANGLES_GENERAL[Math.floor(Math.random() * TOPIC_ANGLES_GENERAL.length)];
}

// Gaya PENULISAN dirotasi tiap generate (terpisah dari nada/tone brand yang
// tetap) — supaya pilihan kata & struktur kalimat tidak itu-itu saja walau
// brand tone-nya sama. Berlaku untuk SEMUA jenis konten.
const WRITING_STYLES = [
  "storytelling singkat (buka dengan potongan cerita/momen kecil)",
  "to-the-point & lugas (langsung ke inti, kalimat pendek-pendek)",
  "hangat & personal (seolah bicara ke satu orang, bukan ke banyak orang)",
  "reflektif & menyentuh (mengajak pembaca merenung sejenak)",
  "playful & ringan (sedikit jenaka, tidak kaku)",
  "informatif dengan satu fakta/angka kecil di awal",
];

function pickWritingStyle(): string {
  return WRITING_STYLES[Math.floor(Math.random() * WRITING_STYLES.length)];
}

// Khusus jenis INTERAKSI — memaksa caption benar-benar memancing interaksi,
// bukan promosi satu arah.
const ONIMAGE_RULE_INTERAKSI =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): PERTANYAAN atau hook yang memancing " +
  "keterlibatan, SESUAIKAN dengan format terpilih " +
  '(mis. kuis: "Tebak isinya apa?"; edukasi: "Tahukah kamu ini?"; tips: "Sering keliru soal ini?"; pilih A/B: "Kamu tim yang mana?").';

const INTERAKSI_CAPTION_RULES =
  "caption = caption Instagram yang MEMANCING INTERAKSI (BUKAN jualan/penjelasan searah), Bahasa Indonesia:\n" +
  "- Pakai bahasa sehari-hari yang SEDERHANA & gampang dimengerti: kalimat pendek, kata umum, hindari istilah rumit/kaku/berbunga-bunga. Bayangkan ngobrol santai dengan teman.\n" +
  "- WAJIB berisi, berurutan: (1) hook relatable dari keseharian pembaca di kalimat pertama; " +
  "(2) SATU pertanyaan langsung ke pembaca; (3) ajakan berinteraksi yang JELAS — mis. 'komen di bawah', " +
  "'tulis pendapatmu', 'tag temanmu', 'simpan dulu', atau 'pilih A atau B'.\n" +
  "- DILARANG berbentuk paragraf promosi atau penjelasan fitur/produk satu arah. Fokus = percakapan, bukan iklan.\n" +
  "- Kalau formatnya kuis/poll: sertakan pilihan (mis. A/B atau opsi) dan JANGAN bocorkan jawaban.\n" +
  "- Nada ngobrol & hangat, boleh sedikit emoji. Variasikan pembuka SETIAP kali; HINDARI klise " +
  '("Pernah nggak sih", "Tenang saja", "Dijamin", "bosku", "gaskeun").\n' +
  "- 2-4 kalimat, DIAKHIRI ajakan interaksi lalu WAJIB 3-6 hashtag relevan (format #katakunci). JANGAN PERNAH mengosongkan hashtag. Patuhi nada brand & hindari topik terlarang.\n" +
  'CONTOH GAYA (jangan disalin persis; SESUAIKAN dengan format terpilih): ' +
  '(kuis) "Coba tebak, menu andalan kami pakai bahan rahasia apa? 🤔 Tulis tebakanmu di komen ya! #..." | ' +
  '(tips) "Simpan dulu: 1 trik biar produkmu awet. Kamu biasanya gimana? Cerita dong 👇 #..."';

const FONT_RULE =
  `fontId = pilih SATU font ID dari daftar berikut yang PALING COCOK dengan suasana dan gaya konten ini (pertimbangkan industri, nada brand, dan target pelanggan): ${FONT_LIST}. ` +
  "Contoh: bisnis elegan → serif/display; playful/anak muda → script/sans bulat; bold/tegas → condensed/display. Jangan selalu pilih yang sama.";

const JSON_TAIL = "Balas HANYA dengan JSON valid, tanpa penjelasan dan tanpa pembungkus markdown.";

export function buildProdukContentPrompt(profile: BusinessProfile, productDescription: string, lang?: Lang): string {
  return `${PERSONA}
${outputLangDirective(lang)}
Buat konten promosi SATU produk, dalam Bahasa Indonesia. Produk = BINTANG UTAMA.

${profileBlock(profile)}

Produk: ${productDescription || "(tidak ada deskripsi)"}

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngle()}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle()} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${ONIMAGE_RULE}
${CAPTION_RULES}
${FONT_RULE}
${JSON_TAIL}`;
}

export function buildGeneralContentPrompt(profile: BusinessProfile, lang?: Lang): string {
  const topic = pickTopicAngleGeneral();
  return `${PERSONA}
${outputLangDirective(lang)}
Buat SATU konten umum (BUKAN promosi produk spesifik) yang menjelaskan/mengangkat usaha ini, dalam Bahasa Indonesia. Tetap pada topik usaha.

${profileBlock(profile)}

TOPIK KONTEN KALI INI (WAJIB pakai ini, JANGAN diganti ke topik lain): ${topic}.

Untuk JUDUL (onImageText) kali ini, pakai ${pickHeadlineAngle()}. Buat frasa BARU yang segar; jangan mengulang judul yang biasa dipakai.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle()} (tetap dalam nada brand yang sudah ditentukan di atas).

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${ONIMAGE_RULE}
${CAPTION_RULES}
imageScene = satu kalimat Bahasa Indonesia, adegan foto realistis yang mencerminkan TOPIK di atas. Spesifik, bukan umum. Tanpa teks/logo di adegan.
${FONT_RULE}
${JSON_TAIL}`;
}

// ── Jenis INTERAKSI: format diacak DI KODE (bukan diserahkan ke AI) supaya
//    BENAR-BENAR bervariasi. Sebelumnya AI disuruh "pilih acak" sendiri, tapi
//    model hampir selalu jatuh ke format perbandingan/split. Sekarang kita
//    pilih satu format via Math.random lalu suntik hanya format itu.
type InteraksiFormat = { label: string; brief: string; scene: string };

const INTERAKSI_FORMATS: InteraksiFormat[] = [
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

function pickInteraksiFormat(): InteraksiFormat {
  return INTERAKSI_FORMATS[Math.floor(Math.random() * INTERAKSI_FORMATS.length)];
}

export function buildInteraksiContentPrompt(profile: BusinessProfile, lang?: Lang): string {
  const format = pickInteraksiFormat();
  return `${PERSONA}
${outputLangDirective(lang)}
Buat SATU konten INTERAKTIF, dalam Bahasa Indonesia. Tujuan UTAMA = memancing INTERAKSI (komentar/simpan/vote/tag), BUKAN jualan.

${profileBlock(profile)}

FORMAT KONTEN KALI INI (WAJIB pakai ini, JANGAN diganti ke format lain): ${format.label}.
Instruksi format: ${format.brief}
Rancang onImageText, caption, DAN imageScene agar KOMPAK & konsisten dengan format di atas, serta benar-benar relevan dengan bisnis dan target pasarnya.
Untuk GAYA PENULISAN caption kali ini, pakai: ${pickWritingStyle()} (tetap konsisten dengan format & nada brand).

Format JSON: {"onImageText": "...", "caption": "...", "jawaban": "...", "imageScene": "...", "fontId": "..."}
${ONIMAGE_RULE_INTERAKSI}
${INTERAKSI_CAPTION_RULES}
jawaban = penjelasan SINGKAT khusus untuk PEMILIK BISNIS (TIDAK ikut diposting ke pelanggan): jelaskan jawaban/maksud konten ini dan poin yang dibahas, supaya kamu paham isinya & siap membalas komentar. Untuk KUIS/TEBAK: tulis jawaban benarnya dengan jelas. Maksimal 1-2 kalimat, bahasa gampang.
imageScene = 1-2 kalimat Bahasa Indonesia. ${format.scene} Adegan WAJIB mengisi PENUH seluruh bingkai dari atas sampai bawah (tanpa area kosong/polos). Boleh gaya ilustrasi, kartun, atau semi-realistis. Spesifik & relatable ke target pasar, bukan generik. TANPA teks/huruf/angka/logo di dalam adegan.
${FONT_RULE}
${JSON_TAIL}`;
}
