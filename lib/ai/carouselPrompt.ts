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
): string {
  const desc = finalImageDescription.trim();
  const cleanTheme = (theme ?? "").trim().slice(0, 200);
  const themeBlockId = cleanTheme
    ? `\n\nTEMA WAJIB DARI USER: "${cleanTheme}". Seluruh carousel (judul, deskripsi tiap slide, caption, dan 3 adegan) HARUS mengikuti tema ini — tema adalah benang merah cerita. Tetap patuhi struktur slide di bawah, dan tetap sambungkan tema ke bisnis + foto slide 4.`
    : "";
  const themeBlockEn = cleanTheme
    ? `\n\nMANDATORY USER THEME: "${cleanTheme}". The whole carousel (titles, slide descriptions, caption, and the 3 scenes) MUST follow this theme — it is the story's thread. Still obey the slide structure below, and still connect the theme to the business + the fixed slide-4 photo.`
    : "";
  if (isEn(lang)) {
    return `You are a social media content strategist for small businesses.
${outputLangDirective(lang)}
Create ONE Instagram CAROUSEL of exactly 4 slides that reads as ONE flowing story from slide 1 to slide 4.

${profileBlock(profile, lang)}

IMPORTANT CONTEXT — SLIDE 4's IMAGE IS FIXED: slide 4 will use the owner's own photo, described as: "${desc || "the business's own product photo"}". The whole story (text AND the 3 generated scenes) must build naturally TOWARD that photo, so slide 4 feels like the payoff.${themeBlockEn}

SLIDE STRUCTURE (mandatory):
- Slide 1 = HOOK: a relatable question or pain point of the target customer. Make people stop scrolling and want to swipe.
- Slide 2 and 3 = VALUE: tips, insight, or a short story that follows the hook and leads toward the solution.
- Slide 4 = SOFT CTA: a gentle, warm invitation that mentions the business name and connects to the fixed photo above. NO hard-selling, NO prices, NO "BUY NOW".

ALSO WRITE 3 SCENES (scenes[0..2]) — one realistic photo scene per slide 1, 2, 3:
- Each scene must VISUALLY match that slide's text (scene 1 shows the problem/hook mood, scenes 2-3 show the journey/value).
- The 3 scenes must feel like ONE photo series: same world, same warm natural lighting, consistent style — and they should plausibly lead to the fixed slide-4 photo.
- Specific, not generic. NO text/logo in any scene.

RULES:
- title: max 8 words, punchy, no quotes/emoji.
- desc: max 20 words, one or two short sentences, no emoji.
- caption: one caption for the whole carousel, 2-4 short sentences + a swipe invitation, natural tone per brand voice, max 3 relevant hashtags.

Respond with ONLY valid JSON, no markdown fences, exactly:
{"slides":[{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."}],"scenes":["...","...","..."],"caption":"..."}`;
  }

  return `Kamu adalah content strategist media sosial untuk UMKM.
${outputLangDirective(lang)}
Buat SATU CAROUSEL Instagram berisi tepat 4 slide yang terbaca sebagai SATU cerita mengalir dari slide 1 sampai slide 4.

${profileBlock(profile, lang)}

KONTEKS PENTING — GAMBAR SLIDE 4 SUDAH DITENTUKAN: slide 4 memakai foto asli milik pemilik usaha, deskripsinya: "${desc || "foto produk milik usaha ini"}". Seluruh cerita (teks DAN 3 adegan yang digenerate) harus mengalir natural MENUJU foto itu, supaya slide 4 terasa sebagai puncaknya.${themeBlockId}

STRUKTUR SLIDE (wajib):
- Slide 1 = HOOK: pertanyaan atau masalah yang relatable bagi target pelanggan. Bikin orang berhenti scroll dan mau geser.
- Slide 2 dan 3 = ISI/NILAI: tips, insight, atau cerita singkat yang nyambung dari hook dan mengarah ke solusinya.
- Slide 4 = CTA SOFT-SELLING: ajakan halus dan hangat yang menyebut nama bisnis dan nyambung dengan foto slide 4 di atas. TANPA hard-sell, TANPA harga, TANPA "BELI SEKARANG".

TULIS JUGA 3 ADEGAN (scenes[0..2]) — satu adegan foto realistis untuk slide 1, 2, 3:
- Tiap adegan harus SESUAI VISUAL dengan teks slide-nya (adegan 1 = suasana masalah/hook, adegan 2-3 = perjalanan/nilai).
- Ketiga adegan harus terasa SATU seri foto: dunia yang sama, pencahayaan natural hangat yang sama, gaya konsisten — dan masuk akal berujung ke foto slide 4 di atas.
- Spesifik, bukan umum. TANPA teks/logo di semua adegan.

ATURAN:
- title: maksimal 8 kata, nendang, tanpa tanda kutip/emoji.
- desc: maksimal 20 kata, satu-dua kalimat pendek, tanpa emoji.
- caption: satu caption untuk seluruh carousel, 2-4 kalimat pendek + ajakan geser slide, nada natural sesuai gaya brand, maksimal 3 hashtag relevan.

Balas HANYA JSON valid, tanpa fence markdown, persis:
{"slides":[{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."}],"scenes":["...","...","..."],"caption":"..."}`;
}

export function buildCarouselSceneImagePrompt(scene: string, lang?: Lang): string {
  return `Foto editorial realistis berkualitas tinggi, pencahayaan natural hangat, depth of field lembut — terasa seperti foto asli yang diambil kamera, BUKAN ilustrasi/kartun/render 3D. Gambar ini bagian dari SERI carousel — gayanya harus natural dan konsisten, cocok berdampingan dengan foto produk asli milik pemilik usaha.
Adegan: ${scene}
SATU foto utuh yang berkesinambungan — DILARANG split-screen, kolase, diptych, side-by-side, atau grid.
Komposisi: isi gambar mengisi SELURUH bingkai (full-bleed) dari tepi ke tepi, tanpa area kosong, tanpa bidang polos, tanpa border.
Jangan menambahkan tulisan, huruf, angka, watermark, logo, atau branding apa pun di dalam gambar — semua objek (kemasan, papan, baju, dinding) harus bersih tanpa teks. DILARANG KERAS teks palsu/gibberish.
${localeSceneNote(lang)}`;
}
