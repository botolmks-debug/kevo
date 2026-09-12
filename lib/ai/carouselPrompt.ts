/**
 * Prompt untuk fitur Carousel di Generate Otomatis (4 slide feed):
 * - User memilih SATU foto miliknya -> jadi gambar slide 4 (penutup/CTA).
 * - Slide 1-3 gambarnya DIGENERATE AI mengikuti alur cerita: JSON di bawah
 *   mengembalikan teks 4 slide + 3 adegan (scenes) yang nyambung dengan teks
 *   tiap slide dan mengarah ke foto user di slide 4.
 * - buildCarouselSceneImagePrompt: prompt gambar per adegan (satu foto utuh,
 *   tanpa teks, edge-to-edge, gaya seragam antar slide).
 */
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { localeSceneNote, outputLangDirective, type Lang } from "@/lib/ai/lang";
import { buildProfileBlock } from "@/lib/ai/profileContext";

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

// profileBlock DIPINDAH ke lib/ai/profileContext.ts (buildProfileBlock) —
// sumber tunggal dipakai semua builder, sekarang termasuk priceRange/story/
// customerType yang dulu TIDAK ikut di file ini (cuma ada di autoContentPrompt.ts).
const profileBlock = buildProfileBlock;


// Variasi sudut HOOK (slide 1) — tanpa ini, hook SELALU balik ke kalimat
// "Masalah pelanggan" persis dari profil bisnis (mis. selalu "stok habis")
// karena itu satu-satunya sudut yang eksplisit ada di prompt. SENGAJA
// TIDAK reuse pickContentDirection() dari autoContentPrompt.ts — instruksi
// itu didesain untuk skema JSON beda (onImageText+caption+fontId) dan
// terbukti bikin AI kadang menyimpang dari skema WAJIB carousel (4 slide +
// 3 scene + caption) saat dicoba. Pool di bawah didesain khusus supaya
// HANYA memengaruhi sudut pandang slide 1, tidak menyentuh instruksi format.
const HOOK_ANGLES_ID = [
  "pertanyaan retoris seputar kebiasaan/rutinitas sehari-hari target pelanggan",
  "momen spesifik dalam keseharian mereka (pagi hari, pas weekend, jam sibuk, dll)",
  "rasa penasaran atau keingintahuan (BUKAN masalah/keluhan)",
  "perbandingan sebelum vs sesudah",
  "satu fakta atau insight kecil yang mengejutkan seputar industri/produk ini",
  "cerita mikro pelanggan lain (tanpa nama asli) yang relate buat target pelanggan",
  "masalah operasional/kualitas — TAPI pilih sisi yang BEDA dari 'masalah pelanggan' yang tertulis eksplisit di profil",
];
const HOOK_ANGLES_EN = [
  "a rhetorical question about the target customer's everyday habits/routine",
  "a specific moment in their daily life (morning, weekend, rush hour, etc.)",
  "curiosity or intrigue (NOT a problem/complaint)",
  "a before-vs-after comparison",
  "one small surprising fact or insight about this industry/product",
  "a relatable micro-story about another customer (no real names)",
  "an operational/quality problem — but pick a DIFFERENT angle than the 'customer problem' explicitly written in the profile",
];

function pickHookAngle(lang?: Lang): string {
  const arr = isEn(lang) ? HOOK_ANGLES_EN : HOOK_ANGLES_ID;
  return arr[Math.floor(Math.random() * arr.length)];
}


export function buildCarouselPrompt(
  profile: BusinessProfile,
  finalImageDescription: string,
  theme?: string,
  lang?: Lang,
  extra?: string,
  // Default 4 = perilaku lama (fitur Carousel biasa, generate-carousel/route.ts).
  // Video Cerita Produk kirim 5 (lihat app/api/video/cerita/storyboard/route.ts).
  slideCount: number = 4,
): string {
  const desc = finalImageDescription.trim();
  const cleanTheme = (theme ?? "").trim().slice(0, 200);
  const hookAngle = pickHookAngle(lang);
  const extraBlock = extra && extra.trim() ? `\n\n${extra.trim()}` : "";
  const sceneCount = Math.max(1, slideCount - 1);
  const lastSlideNum = slideCount;
  const slidesSchema = Array.from({ length: slideCount }, () => `{"title":"...","desc":"..."}`).join(",");
  const scenesSchema = Array.from({ length: sceneCount }, () => `"..."`).join(",");
  const jsonSchema = `{"slides":[${slidesSchema}],"scenes":[${scenesSchema}],"caption":"..."}`;
  const themeBlockId = cleanTheme
    ? `\n\nTEMA WAJIB DARI USER: "${cleanTheme}". Seluruh carousel (judul, deskripsi tiap slide, caption, dan ${sceneCount} adegan) HARUS mengikuti tema ini — tema adalah benang merah cerita. Tetap patuhi struktur slide di bawah, dan tetap sambungkan tema ke bisnis + foto slide ${lastSlideNum}.`
    : "";
  const themeBlockEn = cleanTheme
    ? `\n\nMANDATORY USER THEME: "${cleanTheme}". The whole carousel (titles, slide descriptions, caption, and the ${sceneCount} scenes) MUST follow this theme — it is the story's thread. Still obey the slide structure below, and still connect the theme to the business + the fixed slide-${lastSlideNum} photo.`
    : "";
  if (isEn(lang)) {
    return `You are a social media content strategist for small businesses.
${outputLangDirective(lang)}
Create ONE Instagram CAROUSEL of exactly ${slideCount} slides that reads as ONE flowing story from slide 1 to slide ${lastSlideNum}.

${profileBlock(profile, lang)}

IMPORTANT CONTEXT — SLIDE ${lastSlideNum}'s IMAGE IS FIXED: slide ${lastSlideNum} will use the owner's own photo, described as: "${desc || "the business's own product photo"}". The whole story (text AND the ${sceneCount} generated scenes) must build naturally TOWARD that photo, so slide ${lastSlideNum} feels like the payoff.${themeBlockEn}

SLIDE STRUCTURE (mandatory):
- Slide 1 = HOOK: use this angle — ${hookAngle}. Express it in your own words; this is just the angle, not a literal sentence to copy. A relatable hook for the target customer that makes people stop scrolling and want to swipe.
- Slide 2 through ${lastSlideNum - 1} = VALUE: tips, insight, or a short story that follows the hook and leads toward the solution — each slide should add something NEW, not repeat the previous slide's point.
- Slide ${lastSlideNum} = SOFT CTA: a gentle, warm invitation that mentions the business name and connects to the fixed photo above. NO hard-selling, NO prices, NO "BUY NOW".

STORYTELLING CRAFT (apply across ALL slides 1 to ${lastSlideNum - 1}, not just the hook — this is what separates a carousel people actually swipe through from one they scroll past):
- Emotional trigger: every slide should land on a FEELING (curiosity, mild annoyance, nostalgia, pride, relief, surprise) — not just state a neutral fact. People share/engage with how something makes them feel, not the raw information alone.
- Open loop: slides 1 through ${lastSlideNum - 1} should each end WITHOUT fully resolving the thought they opened — leave a reason to keep swiping. Only slide ${lastSlideNum} is allowed to feel "complete" and resolved.
- Curiosity gap: reveal only PART of the idea per slide — the gap between "what they now know" and "what they still want to know" is what pulls them to the next slide. Never dump the full explanation in one slide.
- Pattern interrupt: vary the RHYTHM and STRUCTURE between consecutive slides — don't let every slide follow the exact same sentence shape/length/opening word. At least one slide should break the pattern the previous slides set (a short punchy line, a direct question, an unexpected angle) so it doesn't feel templated.
- Pacing: mix short, punchy sentences (fast, urgent feel) with a slightly longer one (a beat to think) within the SAME slide when it helps the rhythm — don't make every sentence the same length.

ALSO WRITE ${sceneCount} SCENES (scenes[0..${sceneCount - 1}]) — one realistic photo scene per slide 1 through ${lastSlideNum - 1}:
- Each scene must VISUALLY match that slide's text (scene 1 shows the problem/hook mood, later scenes show the journey/value).
- CRITICAL — DO NOT show the actual product/software/service itself in ANY of these ${sceneCount} scenes: no app screens, no screenshots, no the product held/in-frame, no visible branding of the offering. These scenes are pure BUILD-UP — people, environment, emotion, everyday moments — with the product's presence only implied, never shown. The product's first appearance in the WHOLE carousel must be the payoff reveal in the fixed slide-${lastSlideNum} photo — if scenes 1-${sceneCount} already show it, that reveal is ruined.
- The ${sceneCount} scenes must feel like ONE photo series: same world, same warm natural lighting, consistent style — and they should plausibly lead to the fixed slide-${lastSlideNum} photo.
- Specific, not generic. NO text/logo in any scene.

RULES:
- title: max 8 words, punchy, no quotes/emoji.
- desc: max 20 words, one or two short sentences, no emoji.
- caption: one caption for the whole carousel, 2-4 short sentences + a swipe invitation, natural tone per brand voice, max 3 relevant hashtags.
${extraBlock}
CRITICAL — COUNT CHECK BEFORE YOU ANSWER: the "slides" array MUST contain EXACTLY ${slideCount} objects (not ${slideCount - 1}, not fewer) and "scenes" MUST contain EXACTLY ${sceneCount} strings. Count them yourself before responding — do NOT stop early or drop a slide to save space. If needed, write shorter title/desc text per slide so all ${slideCount} slides fit, but NEVER reduce the number of slides.

Respond with ONLY valid JSON, no markdown fences, exactly:
${jsonSchema}`;
  }

  return `Kamu adalah content strategist media sosial untuk UMKM.
${outputLangDirective(lang)}
Buat SATU CAROUSEL Instagram berisi tepat ${slideCount} slide yang terbaca sebagai SATU cerita mengalir dari slide 1 sampai slide ${lastSlideNum}.

${profileBlock(profile, lang)}

KONTEKS PENTING — GAMBAR SLIDE ${lastSlideNum} SUDAH DITENTUKAN: slide ${lastSlideNum} memakai foto asli milik pemilik usaha, deskripsinya: "${desc || "foto produk milik usaha ini"}". Seluruh cerita (teks DAN ${sceneCount} adegan yang digenerate) harus mengalir natural MENUJU foto itu, supaya slide ${lastSlideNum} terasa sebagai puncaknya.${themeBlockId}

STRUKTUR SLIDE (wajib):
- Slide 1 = HOOK: pakai sudut ini — ${hookAngle}. Sampaikan dengan kata-katamu sendiri; ini cuma SUDUT PANDANG, bukan kalimat literal yang harus disalin. Tetap harus relatable bagi target pelanggan dan bikin orang berhenti scroll mau geser.
- Slide 2 sampai ${lastSlideNum - 1} = ISI/NILAI: tips, insight, atau cerita singkat yang nyambung dari hook dan mengarah ke solusinya — tiap slide WAJIB nambahin hal BARU, jangan mengulang poin slide sebelumnya.
- Slide ${lastSlideNum} = CTA SOFT-SELLING: ajakan halus dan hangat yang menyebut nama bisnis dan nyambung dengan foto slide ${lastSlideNum} di atas. TANPA hard-sell, TANPA harga, TANPA "BELI SEKARANG".

TEKNIK STORYTELLING (terapkan di SEMUA slide 1 sampai ${lastSlideNum - 1}, bukan cuma hook — ini yang membedakan carousel yang beneran digeser orang dari yang cuma di-scroll lewat):
- Emotional trigger: tiap slide harus menyentuh SATU PERASAAN (penasaran, sedikit kesel, nostalgia, bangga, lega, kaget) — bukan cuma menyatakan fakta datar. Orang share/interaksi karena EFEK PERASAANNYA, bukan cuma informasinya.
- Open loop: slide 1 sampai ${lastSlideNum - 1} masing-masing harus berakhir TANPA menyelesaikan tuntas pemikiran yang baru dibuka — sisakan alasan untuk terus geser. Cuma slide ${lastSlideNum} yang boleh terasa "selesai" dan tuntas.
- Curiosity gap: ungkap cuma SEBAGIAN ide per slide — jarak antara "yang sudah mereka tahu" dan "yang masih mereka pengen tahu" itu yang bikin mereka geser ke slide berikutnya. Jangan pernah tumpahkan penjelasan lengkap di satu slide.
- Pattern interrupt: variasikan RITME dan STRUKTUR antar slide yang berurutan — jangan semua slide punya bentuk/panjang kalimat/kata pembuka yang persis sama. Minimal 1 slide harus memutus pola yang dibangun slide-slide sebelumnya (kalimat pendek yang nendang, pertanyaan langsung, sudut pandang tak terduga) supaya tidak terasa template.
- Pacing: campur kalimat pendek yang nendang (kesan cepat, mendesak) dengan kalimat yang sedikit lebih panjang (jeda buat mikir) DALAM SATU slide kalau itu bantu temponya — jangan semua kalimat sama panjangnya.

TULIS JUGA ${sceneCount} ADEGAN (scenes[0..${sceneCount - 1}]) — satu adegan foto realistis untuk slide 1 sampai ${lastSlideNum - 1}:
- Tiap adegan harus SESUAI VISUAL dengan teks slide-nya (adegan 1 = suasana masalah/hook, adegan berikutnya = perjalanan/nilai).
- PENTING — JANGAN tampilkan produk/software/layanan yang sebenarnya di ${sceneCount} adegan ini sama sekali: tanpa layar aplikasi, tanpa screenshot, tanpa produknya dipegang/terlihat di frame, tanpa branding produk yang terlihat. Adegan-adegan ini murni BUILD-UP — orang, suasana, emosi, momen keseharian — kehadiran produknya cukup TERSIRAT, jangan pernah ditampilkan. Kemunculan produk PERTAMA KALI di seluruh carousel harus jadi momen puncak di foto slide ${lastSlideNum} yang sudah ditentukan — kalau adegan 1-${sceneCount} sudah menampilkannya duluan, momen puncak itu jadi hilang efeknya.
- Ke-${sceneCount} adegan harus terasa SATU seri foto: dunia yang sama, pencahayaan natural hangat yang sama, gaya konsisten — dan masuk akal berujung ke foto slide ${lastSlideNum} di atas.
- Spesifik, bukan umum. TANPA teks/logo di semua adegan.

ATURAN:
- title: maksimal 8 kata, nendang, tanpa tanda kutip/emoji.
- desc: maksimal 20 kata, satu-dua kalimat pendek, tanpa emoji.
- caption: satu caption untuk seluruh carousel, 2-4 kalimat pendek + ajakan geser slide, nada natural sesuai gaya brand, maksimal 3 hashtag relevan.
${extraBlock}
PENTING — CEK JUMLAH SEBELUM JAWAB: array "slides" WAJIB berisi TEPAT ${slideCount} objek (bukan ${slideCount - 1}, bukan kurang) dan "scenes" WAJIB berisi TEPAT ${sceneCount} string. Hitung sendiri sebelum menjawab — JANGAN berhenti lebih awal atau mengurangi jumlah slide demi menghemat tempat. Kalau perlu, buat title/desc tiap slide lebih pendek supaya ke-${slideCount} slide tetap muat, tapi JANGAN PERNAH mengurangi jumlah slide-nya.

Balas HANYA JSON valid, tanpa fence markdown, persis:
${jsonSchema}`;
}

export function buildCarouselSceneImagePrompt(scene: string, lang?: Lang, mainProduct?: string): string {
  const guardId = mainProduct?.trim()
    ? `\nJANGAN tampilkan "${mainProduct.trim()}" (produk/layanan utama bisnis ini) di foto ini — tanpa layar aplikasi, tanpa screenshot, tanpa produk itu dipegang/terlihat, tanpa branding-nya. Ini foto suasana/build-up saja, produknya baru muncul di slide penutup.`
    : "";
  const guardEn = mainProduct?.trim()
    ? `\nDo NOT show "${mainProduct.trim()}" (this business's main product/service) in this photo — no app screen, no screenshot, no the product held/visible, no its branding. This is a pure mood/build-up photo; the product only appears in the closing slide.`
    : "";
  if (isEn(lang)) {
    return `High-quality realistic editorial photo, warm natural lighting, soft depth of field — feels like a genuine camera photo, NOT an illustration/cartoon/3D render. Part of a carousel SERIES — style must be natural and consistent, fit alongside the business owner's own real product photo.
Scene: ${scene}
ONE cohesive full photo — NO split-screen, collage, diptych, side-by-side, or grid.
Composition: content fills the ENTIRE frame edge-to-edge, no empty areas, no plain fields, no border.
Do not add any writing, letters, numbers, watermark, logo, or branding anywhere in the image — all objects (packaging, signs, clothing, walls) must be clean, no text. Fake/gibberish text is STRICTLY FORBIDDEN.${guardEn}
${localeSceneNote(lang)}`;
  }
  return `Foto editorial realistis berkualitas tinggi, pencahayaan natural hangat, depth of field lembut — terasa seperti foto asli yang diambil kamera, BUKAN ilustrasi/kartun/render 3D. Gambar ini bagian dari SERI carousel — gayanya harus natural dan konsisten, cocok berdampingan dengan foto produk asli milik pemilik usaha.
Adegan: ${scene}
SATU foto utuh yang berkesinambungan — DILARANG split-screen, kolase, diptych, side-by-side, atau grid.
Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos, tanpa border.
Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau branding apa pun di dalam gambar — semua objek (kemasan, papan, baju, dinding) harus bersih tanpa teks. DILARANG KERAS teks palsu/gibberish.${guardId}
${localeSceneNote(lang)}`;
}

/**
 * Prompt untuk SLIDE LANJUTAN (2 & 3) dalam mode "cerita berantai" —
 * setiap slide TETAP foto utuh & bermakna sendiri (bukan potongan gambar),
 * tapi digenerate dengan foto slide SEBELUMNYA sebagai referensi supaya
 * orang/tempat/kondisi/pencahayaannya konsisten — seperti halaman
 * berikutnya di buku cerita yang sama, bukan gambar yang dipotong.
 */
export function buildCarouselContinuedSceneImagePrompt(scene: string, lang?: Lang, mainProduct?: string): string {
  const guardId = mainProduct?.trim()
    ? `\nJANGAN tampilkan "${mainProduct.trim()}" (produk/layanan utama bisnis ini) di foto ini — tanpa layar aplikasi, tanpa screenshot, tanpa produk itu dipegang/terlihat, tanpa branding-nya. Ini foto suasana/build-up saja, produknya baru muncul di slide penutup.`
    : "";
  const guardEn = mainProduct?.trim()
    ? `\nDo NOT show "${mainProduct.trim()}" (this business's main product/service) in this photo — no app screen, no screenshot, no the product held/visible, no its branding. This is a pure mood/build-up photo; the product only appears in the closing slide.`
    : "";

  if (isEn(lang)) {
    return `The attached image is the PREVIOUS page of an ongoing visual story (a carousel). This new image is the NEXT page of that SAME story — keep the SAME subject/character (if any person appears, same person, same outfit), the SAME location, and the SAME lighting/mood/color grading as the attached image, as if only a short moment has passed.

BUT this new page must depict its OWN specific moment, matching this idea: ${scene}
This must be a COMPLETE, deliberately composed photo that stands on its own and clearly tells THIS moment of the story — NOT a leftover fragment or empty continuation of the previous image. Change the framing/composition/action meaningfully so it reads as real forward progress in the story, not a near-duplicate of the previous page.

High-quality realistic editorial photo — feels like a genuine camera photo, NOT an illustration/cartoon/3D render.
ONE cohesive full photo — NO split-screen, collage, diptych, side-by-side, or grid.
Composition: content fills the ENTIRE frame edge-to-edge, no empty areas, no plain fields, no border.
Do not add any writing, letters, numbers, watermark, logo, or branding anywhere in the image. Fake/gibberish text is STRICTLY FORBIDDEN.${guardEn}
${localeSceneNote(lang)}`;
  }

  return `Gambar terlampir adalah HALAMAN SEBELUMNYA dari cerita visual yang sedang berjalan (carousel). Gambar baru ini adalah HALAMAN BERIKUTNYA dari cerita yang SAMA — pertahankan subjek/karakter yang SAMA (kalau ada orang, orang yang sama, baju yang sama), LOKASI yang SAMA, dan pencahayaan/mood/color grading yang SAMA seperti gambar terlampir, seolah baru berselang sebentar.

TAPI halaman baru ini harus menggambarkan momennya SENDIRI, sesuai ide ini: ${scene}
Ini harus jadi foto LENGKAP yang disusun sengaja, berdiri sendiri, dan jelas menceritakan momen INI — BUKAN sisa potongan atau lanjutan kosong dari gambar sebelumnya. Ubah framing/komposisi/aksi secara berarti supaya terasa benar-benar maju ceritanya, bukan hampir sama persis dengan halaman sebelumnya.

Foto editorial realistis berkualitas tinggi — terasa seperti foto asli yang diambil kamera, BUKAN ilustrasi/kartun/render 3D.
SATU foto utuh yang berkesinambungan — DILARANG split-screen, kolase, diptych, side-by-side, atau grid.
Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos, tanpa border.
Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau branding apa pun. DILARANG KERAS teks palsu/gibberish.${guardId}
${localeSceneNote(lang)}`;
}

/**
 * Prompt EDIT untuk foto SLIDE TERAKHIR (foto produk ASLI milik user) —
 * dipakai dengan editImageWithReference (IMAGE 1 = foto asli, IMAGE 2 =
 * foto AI terakhir yang sudah digenerate untuk slide-slide sebelumnya)
 * supaya slide penutup terasa SATU seri dengan slide-slide sebelumnya
 * (lighting/gaya/mood nyambung), bukan foto mentah yang beda dunia. Produk
 * WAJIB dijaga 100% (bentuk, label, isi) — cuma lighting & latar yang boleh
 * disesuaikan.
 */
/**
 * EKSPERIMENTAL — prompt untuk 1 foto PANORAMA (via OpenAI, ukuran terlebar
 * yang didukung "1536x1024" ≈ rasio 3:2) yang akan dipotong
 * jadi 4 bagian, lihat lib/images/splitPanorama.ts). Beda dari versi
 * "cerita berantai" (tiap slide generate terpisah): di sini SATU generate
 * menghasilkan seluruh 4 momen sekaligus dalam 1 komposisi lebar yang
 * mengalir, dan kalau ada foto produk asli, foto itu DIKIRIM SEBAGAI INPUT
 * (bukan ditempel belakangan) supaya AI menganyamnya natural ke bagian
 * terakhir (slide 4).
 */
export function buildCarouselPanoramaPrompt(
  slideDescs: [string, string],
  lang?: Lang,
  mainProduct?: string,
): string {
  const productNoteEn = mainProduct?.trim()
    ? `Do NOT show "${mainProduct.trim()}" (this business's main product/service) anywhere in this image — no app screen, no screenshot, no the product held/visible, no its branding. This photo is pure mood/atmosphere; the product only appears in the separate closing slide.`
    : "";
  const productNoteId = mainProduct?.trim()
    ? `JANGAN tampilkan "${mainProduct.trim()}" (produk/layanan utama bisnis ini) di mana pun di gambar ini — tanpa layar aplikasi, tanpa screenshot, tanpa produk itu dipegang/terlihat, tanpa branding-nya. Foto ini murni suasana/mood; produknya baru muncul di slide penutup yang terpisah.`
    : "";

  if (isEn(lang)) {
    return `Shot on a full-frame DSLR camera, 35mm lens, natural window light, shallow depth of field, visible film grain, true photographic realism — this must look like an ACTUAL PHOTOGRAPH taken by a real photographer, indistinguishable from a real camera shot. ABSOLUTELY NOT a digital illustration, painting, cartoon, anime, 3D render, CGI, or stylized/artistic interpretation — skin, fabric, wood, and light must have real photographic texture and imperfection, not smooth/idealized rendered surfaces. Rich, warm, editorial color grading — golden-hour warmth, deep saturated tones in clothing/decor/accents, warm highlights and cool shadows (a look like a professional lifestyle-brand campaign photo) — avoid a flat, dull, washed-out, or grayish color palette.

Imagine a single continuous panning shot — like a video camera slowly panning left-to-right across ONE unbroken physical room/space in ONE take, then flattened into a single wide still frame. There is only ONE floor plane, ONE ceiling/wall line, and ONE light source (e.g. one window) for the entire image — trace these as continuous, unbroken lines running from the far-left edge to the far-right edge with NO visible seam, cut, or change in perspective/lighting anywhere across the frame. It is the same person (if a person appears) wearing the same outfit throughout, moving/acting through this one continuous space — not 2 different people or 2 different rooms stitched together.

Along this single continuous shot, the story naturally progresses through 2 EQUAL halves (left to right):
1 (left half): ${slideDescs[0]}
2 (right half): ${slideDescs[1]}
${productNoteEn}

This image will later be cut into 2 EQUAL vertical halves (one per slide) — because the whole scene is physically ONE continuous space, each half will naturally look connected to its neighbor (same floor line, same wall, same light continuing across the cut) without you needing to think about the boundary; just do NOT place any single most-important subject exactly on the center dividing line.

Composition: content fills the ENTIRE frame edge-to-edge, no empty areas, no plain fields, no border, no letterboxing, no visible panel divider or hard seam between the 2 moments.
Do not add any writing, letters, numbers, watermark, logo, or branding anywhere in the image — all objects (packaging, signs, clothing, walls, screens) must be completely clean, no text of any kind. This is the single most important rule: ZERO text anywhere in the output, fake/gibberish text is STRICTLY FORBIDDEN.
${localeSceneNote(lang)}`;
  }

  return `Dipotret pakai kamera DSLR full-frame, lensa 35mm, cahaya jendela natural, depth of field dangkal, grain film yang terlihat, realisme fotografi sungguhan — ini HARUS terlihat seperti FOTO ASLI yang diambil fotografer sungguhan, tidak bisa dibedakan dari jepretan kamera nyata. SAMA SEKALI BUKAN ilustrasi digital, lukisan, kartun, anime, render 3D, CGI, atau interpretasi bergaya artistik — kulit, kain, kayu, dan cahaya harus punya tekstur & ketidaksempurnaan fotografis asli, bukan permukaan halus/ideal ala render. Color grading editorial yang kaya & hangat — nuansa golden-hour, warna jenuh dalam di baju/dekor/aksen, highlight hangat & shadow sejuk (kesan seperti foto kampanye brand lifestyle profesional) — hindari palet warna datar, kusam, pudar, atau keabu-abuan.

Bayangkan ini 1 pengambilan panning kamera berkesinambungan — seperti kamera video pelan-pelan geser dari kiri ke kanan melintasi SATU ruang/tempat fisik yang tidak terputus dalam 1 take, lalu diratakan jadi 1 bingkai diam lebar. Cuma ada SATU bidang lantai, SATU garis dinding/langit-langit, dan SATU sumber cahaya (mis. 1 jendela) untuk seluruh gambar — jaga garis-garis ini tetap MENYAMBUNG TANPA PUTUS dari tepi paling kiri sampai tepi paling kanan, TANPA jahitan/potongan/perubahan perspektif atau pencahayaan yang terlihat di mana pun sepanjang bingkai. Ini orang yang SAMA (kalau ada orang) pakai baju yang SAMA sepanjang gambar, bergerak/beraktivitas melintasi 1 ruang berkesinambungan ini — BUKAN 2 orang berbeda atau 2 ruangan berbeda yang ditempel jadi satu.

Sepanjang 1 pengambilan berkesinambungan ini, ceritanya mengalir natural lewat 2 SEPARUH BAGIAN SAMA RATA (kiri ke kanan):
1 (separuh kiri): ${slideDescs[0]}
2 (separuh kanan): ${slideDescs[1]}
${productNoteId}

Gambar ini nanti dipotong jadi 2 potongan vertikal SAMA LEBAR (1 per slide) — karena seluruh adegan secara fisik itu 1 ruang berkesinambungan, tiap potongan otomatis akan terasa nyambung dengan tetangganya (garis lantai sama, dinding sama, cahaya menyambung lewat titik potong) tanpa kamu perlu memikirkan batasnya; cukup JANGAN taruh 1 subjek terpenting persis di garis tengah pembagi.

Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos, tanpa border, tanpa letterbox, TANPA garis pembatas panel atau jahitan keras terlihat antar 2 momen.
Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau branding apa pun di dalam gambar — semua objek (kemasan, papan, baju, dinding, layar) harus benar-benar bersih, tanpa teks jenis apa pun. Ini aturan PALING PENTING: NOL teks di mana pun di hasil akhir, teks palsu/gibberish DILARANG KERAS.
${localeSceneNote(lang)}`;
}

export function buildCarouselSlide4EditPrompt(
  lastSlide: { title: string; desc: string },
  lang?: Lang,
  ratio: "9:16" | "4:5" | "1:1" = "9:16",
): string {
  const ratioLabelEn = ratio === "1:1" ? "square 1:1" : ratio === "4:5" ? "portrait 4:5" : "portrait 9:16 (tall/full-screen)";
  const ratioLabelId = ratio === "1:1" ? "kotak 1:1" : ratio === "4:5" ? "potret 4:5" : "potret 9:16 (tinggi penuh layar)";
  if (isEn(lang)) {
    return `You are a world-class commercial product photographer.

IMAGE 1 = the REAL product photo — this is the actual product being sold, not a generated image.
IMAGE 2 = the last of the AI-generated photos already made for the earlier slides of the same carousel — its lighting, mood, colour grading, and overall style define the "world" of this photo series.

STEP 1 - PRODUCT IDENTITY (preserve 100%, from IMAGE 1): keep the product's exact shape, proportions, materials, real colors, and ALL text/labels/prints physically on it — sharp and unchanged. Keep its real contents (food, liquid, packaging interior) exactly as photographed. Do NOT redraw, restyle, reshape, add, or remove any part of the product.
STEP 2 - LIGHTING & STYLE CONTINUITY (from IMAGE 2), NOT A LOCATION COPY: re-render the product's lighting, shadows, reflections, and background so this photo feels like the SAME warm natural light direction/softness, the SAME colour grading, and the SAME overall photographic mood as IMAGE 2 — as if shot by the same photographer on the same day. But the setting itself must be a DIFFERENT moment/spot within that same world, not a copy of IMAGE 2's exact background: change the framing, the specific surface/furniture/props, and the composition so it doesn't read as "the exact same corridor/room/backdrop, just with the product swapped in". Think "next shot in the same photoshoot", not "same photo, different subject pasted on top".
STEP 3 - This is the FINAL "payoff" slide of the story — a moment about: ${lastSlide.desc}. Compose the scene so it naturally supports this closing moment and mood. Frame it like a proper PRODUCT shot (appropriate product-to-frame scale, e.g. tabletop/surface/hand-held framing) — do NOT reuse a full-body human framing/scale from a people-scene just because IMAGE 2 happened to feature a person; the product should look naturally sized for a product photo, not oddly blown up to fill a person-sized frame. This description is ONLY for mood/composition guidance — under NO circumstances render any of these words as visible text/writing anywhere in the image.
STEP 4 - Remove any overlaid text, watermark, phone brand stamp, date stamp, or logo that is NOT physically printed on the product itself. ABSOLUTE RULE: the output image must contain ZERO added text, letters, numbers, or writing of any kind (beyond what is physically printed on the real product itself) — no title, no caption, no random/gibberish text, nothing. This is the single most important rule in this prompt.

Output: ONE full-bleed photorealistic photo, ${ratioLabelEn}, edge-to-edge, no added text/logo/watermark, no collage/split-screen.`;
  }

  return `Kamu adalah fotografer produk komersial kelas dunia.

IMAGE 1 = foto produk ASLI — ini produk sungguhan yang dijual, bukan gambar hasil AI.
IMAGE 2 = foto terakhir dari foto-foto AI yang sudah dibuat untuk slide-slide sebelumnya di carousel yang sama — lighting, mood, color grading, dan gaya fotonya menentukan "dunia" seri foto ini.

LANGKAH 1 - IDENTITAS PRODUK (jaga 100%, dari IMAGE 1): pertahankan bentuk, proporsi, material, warna asli, dan SEMUA teks/label/cetakan yang ada fisik di produk — tetap tajam & tidak berubah. Pertahankan isi asli produk (makanan, cairan, isi kemasan) persis seperti di foto aslinya. JANGAN menggambar ulang, mengubah gaya, mengubah bentuk, menambah, atau menghapus bagian produk mana pun.
LANGKAH 2 - KESINAMBUNGAN LIGHTING & GAYA (dari IMAGE 2), BUKAN COPY LOKASI: render ulang lighting, bayangan, refleksi, dan latar produk supaya foto ini punya arah & kelembutan cahaya hangat yang SAMA, color grading yang SAMA, dan mood fotografi yang SAMA seperti IMAGE 2 — seolah dipotret fotografer yang sama di hari yang sama. TAPI lokasinya sendiri harus jadi momen/spot BERBEDA dalam dunia yang sama itu, bukan copy latar IMAGE 2 persis: ubah framing, permukaan/furnitur/properti spesifiknya, dan komposisinya supaya tidak terkesan "koridor/ruangan/latar yang sama persis, cuma produknya ditukar". Bayangkan "jepretan berikutnya di sesi pemotretan yang sama", BUKAN "foto yang sama, subjeknya ditempel beda".
LANGKAH 3 - Ini slide PENUTUP/puncak cerita — momen tentang: ${lastSlide.desc}. Susun adegannya supaya natural mendukung momen & suasana penutup ini. Bingkai foto ini sebagai foto PRODUK yang proporsional (mis. di atas meja/permukaan/dipegang tangan) — JANGAN ikut memakai framing/skala tubuh manusia dari IMAGE 2 hanya karena kebetulan IMAGE 2 menampilkan orang; produknya harus terlihat berukuran wajar untuk foto produk, bukan dibesarkan aneh sampai memenuhi bingkai seukuran orang. Deskripsi ini HANYA untuk panduan suasana/komposisi — DALAM KONDISI APA PUN jangan gambar kata-kata ini sebagai tulisan/teks yang terlihat di gambar.
LANGKAH 4 - Hapus teks overlay, watermark, stempel merek HP, stempel tanggal, atau logo apa pun yang BUKAN tercetak fisik di produk itu sendiri. ATURAN MUTLAK: gambar hasil WAJIB NOL tambahan teks/huruf/angka/tulisan apa pun (di luar yang memang tercetak fisik di produk asli) — tanpa judul, tanpa caption, tanpa teks acak/gibberish, tanpa apa pun. Ini aturan PALING PENTING di prompt ini.

Hasil: SATU foto utuh fotorealistis, ${ratioLabelId}, penuh sampai tepi (full-bleed), TANPA tambahan teks/logo/watermark, TANPA kolase/split-screen.`;
}
