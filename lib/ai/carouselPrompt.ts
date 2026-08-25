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

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

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

function profileBlock(profile: BusinessProfile, lang?: Lang): string {
  if (isEn(lang)) {
    return `Business profile (MUST be the foundation of the content — don't be generic):
- Name: ${profile.business.name || "-"}
- Industry: ${profile.business.industry || "-"}
- Location: ${profile.business.location || "-"}
- Main products/services: ${profile.offering.mainProducts || "-"}
- Target customer: ${profile.offering.targetCustomer || "-"}
- Customer problem being solved: ${profile.offering.customerProblem || "-"}
- Differentiator/USP: ${profile.positioning.differentiator || "-"}
- Brand voice/tone: ${profile.positioning.tone || "neutral"}
- CTA: ${profile.positioning.cta || "-"}
- AVOID: ${profile.positioning.avoid || "-"}`;
  }
  return `Profil bisnis (WAJIB jadi dasar konten — jangan generik):
- Nama: ${profile.business.name || "-"}
- Industri: ${profile.business.industry || "-"}
- Lokasi: ${profile.business.location || "-"}
- Produk/layanan utama: ${profile.offering.mainProducts || "-"}
- Target pelanggan: ${profile.offering.targetCustomer || "-"}
- Masalah pelanggan yang diselesaikan: ${profile.offering.customerProblem || "-"}
- Pembeda/USP: ${profile.positioning.differentiator || "-"}
- Nada/gaya brand: ${profile.positioning.tone || "netral"}
- CTA: ${profile.positioning.cta || "-"}
- HINDARI: ${profile.positioning.avoid || "-"}`;
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

ALSO WRITE ${sceneCount} SCENES (scenes[0..${sceneCount - 1}]) — one realistic photo scene per slide 1 through ${lastSlideNum - 1}:
- Each scene must VISUALLY match that slide's text (scene 1 shows the problem/hook mood, later scenes show the journey/value).
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

TULIS JUGA ${sceneCount} ADEGAN (scenes[0..${sceneCount - 1}]) — satu adegan foto realistis untuk slide 1 sampai ${lastSlideNum - 1}:
- Tiap adegan harus SESUAI VISUAL dengan teks slide-nya (adegan 1 = suasana masalah/hook, adegan berikutnya = perjalanan/nilai).
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

export function buildCarouselSceneImagePrompt(scene: string, lang?: Lang): string {
  return `Foto editorial realistis berkualitas tinggi, pencahayaan natural hangat, depth of field lembut — terasa seperti foto asli yang diambil kamera, BUKAN ilustrasi/kartun/render 3D. Gambar ini bagian dari SERI carousel — gayanya harus natural dan konsisten, cocok berdampingan dengan foto produk asli milik pemilik usaha.
Adegan: ${scene}
SATU foto utuh yang berkesinambungan — DILARANG split-screen, kolase, diptych, side-by-side, atau grid.
Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos, tanpa border.
Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau branding apa pun di dalam gambar — semua objek (kemasan, papan, baju, dinding) harus bersih tanpa teks. DILARANG KERAS teks palsu/gibberish.
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
export function buildCarouselSlide4EditPrompt(
  lastSlide: { title: string; desc: string },
  lang?: Lang,
): string {
  if (isEn(lang)) {
    return `You are a world-class commercial product photographer.

IMAGE 1 = the REAL product photo — this is the actual product being sold, not a generated image.
IMAGE 2 = the last of the AI-generated photos already made for the earlier slides of the same carousel — its lighting, mood, colour grading, and overall style define the "world" of this photo series.

STEP 1 - PRODUCT IDENTITY (preserve 100%, from IMAGE 1): keep the product's exact shape, proportions, materials, real colors, and ALL text/labels/prints physically on it — sharp and unchanged. Keep its real contents (food, liquid, packaging interior) exactly as photographed. Do NOT redraw, restyle, reshape, add, or remove any part of the product.
STEP 2 - LIGHTING & STYLE CONTINUITY (from IMAGE 2): re-render the product's lighting, shadows, reflections, and background so this photo feels like it belongs in the SAME series as IMAGE 2 — same warm natural lighting direction and softness, same colour mood, same photographic style. All photos together must look like ONE consistent shoot, not unrelated images.
STEP 3 - This is the FINAL "payoff" slide of the story: title "${lastSlide.title}", text "${lastSlide.desc}". Compose the scene so it naturally supports this closing moment.
STEP 4 - Remove any overlaid text, watermark, phone brand stamp, date stamp, or logo that is NOT physically printed on the product itself.

Output: ONE full-bleed photorealistic photo, portrait 9:16 (tall/full-screen), edge-to-edge, no added text/logo/watermark, no collage/split-screen.`;
  }

  return `Kamu adalah fotografer produk komersial kelas dunia.

IMAGE 1 = foto produk ASLI — ini produk sungguhan yang dijual, bukan gambar hasil AI.
IMAGE 2 = foto terakhir dari foto-foto AI yang sudah dibuat untuk slide-slide sebelumnya di carousel yang sama — lighting, mood, color grading, dan gaya fotonya menentukan "dunia" seri foto ini.

LANGKAH 1 - IDENTITAS PRODUK (jaga 100%, dari IMAGE 1): pertahankan bentuk, proporsi, material, warna asli, dan SEMUA teks/label/cetakan yang ada fisik di produk — tetap tajam & tidak berubah. Pertahankan isi asli produk (makanan, cairan, isi kemasan) persis seperti di foto aslinya. JANGAN menggambar ulang, mengubah gaya, mengubah bentuk, menambah, atau menghapus bagian produk mana pun.
LANGKAH 2 - KESINAMBUNGAN LIGHTING & GAYA (dari IMAGE 2): render ulang lighting, bayangan, refleksi, dan latar produk supaya foto ini terasa SATU seri dengan IMAGE 2 — arah & kelembutan cahaya hangat yang sama, mood warna yang sama, gaya fotografi yang sama. Semua foto bersama-sama harus terlihat seperti SATU sesi pemotretan yang konsisten, bukan gambar-gambar yang tidak nyambung.
LANGKAH 3 - Ini slide PENUTUP/puncak cerita: judul "${lastSlide.title}", teks "${lastSlide.desc}". Susun adegannya supaya natural mendukung momen penutup ini.
LANGKAH 4 - Hapus teks overlay, watermark, stempel merek HP, stempel tanggal, atau logo apa pun yang BUKAN tercetak fisik di produk itu sendiri.

Hasil: SATU foto utuh fotorealistis, potret 9:16 (tinggi penuh layar), penuh sampai tepi (full-bleed), TANPA tambahan teks/logo/watermark, TANPA kolase/split-screen.`;
}
