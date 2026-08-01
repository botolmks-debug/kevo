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
- Umur bisnis: ${profile.business.age || "-"}
- Lokasi: ${profile.business.location || "-"}
- Produk/layanan utama: ${profile.offering.mainProducts || "-"}
- Produk unggulan: ${profile.offering.flagshipProduct || "-"}
- Kisaran harga: ${profile.offering.priceRange || "-"}
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
  "Rangkai data profil menjadi konten SPESIFIK, relevan, dan sesuai gaya brand.";

const CAPTION_RULES =
  "caption = caption Instagram yang HIDUP dan berempati, dalam Bahasa Indonesia:\n" +
  "- Variasikan gaya pembuka SETIAP kali. HINDARI klise: \"Pernah nggak sih\", \"Bikin panik\", \"Tenang saja\", \"Dijamin\", \"bosku\", \"gaskeun\". Jangan mengulang kata yang sama.\n" +
  "- Gunakan perumpamaan/analogi yang relevan.\n" +
  "- Sentuh PERASAAN pembaca: tunjukkan empati terhadap apa yang mereka rasakan, khawatirkan, atau impikan.\n" +
  "- Boleh dari sudut pandang pembaca (\"aku/kita\"), menyuarakan keseharian mereka.\n" +
  "- Isi 2-4 kalimat, satu CTA halus, 3-6 hashtag. Patuhi nada brand & hindari topik terlarang.";

const ONIMAGE_RULE =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): headline menarik, segar, tidak klise.";

// Khusus jenis INTERAKSI — memaksa caption benar-benar memancing interaksi,
// bukan promosi satu arah.
const ONIMAGE_RULE_INTERAKSI =
  "onImageText = teks pendek DI ATAS gambar (maks 8 kata): berupa PERTANYAAN atau hook yang " +
  'memancing rasa penasaran/keterlibatan (mis. "Kamu tim yang mana?", "Tebak, apa hayo?").';

const INTERAKSI_CAPTION_RULES =
  "caption = caption Instagram yang MEMANCING INTERAKSI (BUKAN jualan/penjelasan searah), Bahasa Indonesia:\n" +
  "- WAJIB berisi, berurutan: (1) hook relatable dari keseharian pembaca di kalimat pertama; " +
  "(2) SATU pertanyaan langsung ke pembaca; (3) ajakan berinteraksi yang JELAS — mis. 'komen di bawah', " +
  "'tulis pendapatmu', 'tag temanmu', 'simpan dulu', atau 'pilih A atau B'.\n" +
  "- DILARANG berbentuk paragraf promosi atau penjelasan fitur/produk satu arah. Fokus = percakapan, bukan iklan.\n" +
  "- Kalau formatnya kuis/poll: sertakan pilihan (mis. A/B atau opsi) dan JANGAN bocorkan jawaban.\n" +
  "- Nada ngobrol & hangat, boleh sedikit emoji. Variasikan pembuka SETIAP kali; HINDARI klise " +
  '("Pernah nggak sih", "Tenang saja", "Dijamin", "bosku", "gaskeun").\n' +
  "- 2-4 kalimat, DIAKHIRI ajakan interaksi + 3-6 hashtag relevan. Patuhi nada brand & hindari topik terlarang.\n" +
  'CONTOH GAYA (jangan disalin persis): "Ngaku, siapa di sini yang paling nggak sabaran kalau lagi antre? 🙋 ' +
  'Kira-kira, lebih enak beli cepat lewat mesin atau tetap dilayani orang? Komen pilihanmu di bawah ya! #..."';

const FONT_RULE =
  `fontId = pilih SATU font ID dari daftar berikut yang PALING COCOK dengan suasana dan gaya konten ini (pertimbangkan industri, nada brand, dan target pelanggan): ${FONT_LIST}. ` +
  "Contoh: bisnis elegan → serif/display; playful/anak muda → script/sans bulat; bold/tegas → condensed/display. Jangan selalu pilih yang sama.";

const JSON_TAIL = "Balas HANYA dengan JSON valid, tanpa penjelasan dan tanpa pembungkus markdown.";

export function buildProdukContentPrompt(profile: BusinessProfile, productDescription: string): string {
  return `${PERSONA}
Buat konten promosi SATU produk, dalam Bahasa Indonesia. Produk = BINTANG UTAMA.

${profileBlock(profile)}

Produk: ${productDescription || "(tidak ada deskripsi)"}

Format JSON: {"onImageText": "...", "caption": "...", "fontId": "..."}
${ONIMAGE_RULE}
${CAPTION_RULES}
${FONT_RULE}
${JSON_TAIL}`;
}

export function buildGeneralContentPrompt(profile: BusinessProfile): string {
  return `${PERSONA}
Buat SATU konten umum (BUKAN promosi produk spesifik) yang menjelaskan/mengangkat usaha ini, dalam Bahasa Indonesia — edukasi, manfaat, cerita brand, atau momen berkaitan. Tetap pada topik usaha.

${profileBlock(profile)}

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${ONIMAGE_RULE}
${CAPTION_RULES}
imageScene = satu kalimat Bahasa Indonesia, adegan foto realistis yang mencerminkan isi konten. Spesifik, bukan umum. Tanpa teks/logo di adegan.
${FONT_RULE}
${JSON_TAIL}`;
}

export function buildInteraksiContentPrompt(profile: BusinessProfile): string {
  return `${PERSONA}
Buat SATU konten INTERAKTIF, dalam Bahasa Indonesia. Tujuan UTAMA = memancing INTERAKSI (komentar/simpan/vote/tag), BUKAN jualan. Boleh berupa pertanyaan, kuis/poll, "pilih A atau B", atau tips singkat yang DIAKHIRI pertanyaan. Angkat keseharian/perasaan pembaca, jangan menjelaskan produk satu arah.

${profileBlock(profile)}

Format JSON: {"onImageText": "...", "caption": "...", "imageScene": "...", "fontId": "..."}
${ONIMAGE_RULE_INTERAKSI}
${INTERAKSI_CAPTION_RULES}
imageScene = satu kalimat Bahasa Indonesia, ilustrasi/adegan interaksi bisnis & pelanggan. Boleh kartun/animasi/realistis. Tanpa teks/logo.
${FONT_RULE}
${JSON_TAIL}`;
}
