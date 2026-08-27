/**
 * POST /api/video/cerita/storyboard — fitur umum (semua user login).
 * Reuse carouselPrompt (SLIDE_COUNT slide title+desc + SLIDE_COUNT-1 adegan
 * foto) lalu tambah 1 panggilan naskah narasi (ceritaPrompt, 1 segmen per
 * slide). Slide TERAKHIR = foto asli milik user (dipilih di client) —
 * DIEDIT ulang (editImageWithReference, produk dijaga 100%) supaya seirama
 * gaya dengan foto-foto AI sebelumnya, bukan dipakai mentah-mentah.
 * Belum menyentuh ElevenLabs (biaya nyata) — itu di /api/video/cerita/tts,
 * dipanggil setelah user setuju naskah & gambar di step ini.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeTokens, refundTokens } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages } from "@/lib/supabase/images";
import { logError } from "@/lib/monitoring/errorLog";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { generateImage, editImageWithReference } from "@/lib/ai/geminiImage";
import { describeProductImage } from "@/lib/ai/describeImage";
import { buildCarouselPrompt, buildCarouselSceneImagePrompt, buildCarouselSlide4EditPrompt } from "@/lib/ai/carouselPrompt";
import { buildCeritaNarrationPrompt } from "@/lib/ai/ceritaPrompt";
import { getRecentCaptions, buildAntiRepetisiBlock } from "@/lib/ai/antiRepetisi";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUCKET = "user-images";

// Jumlah slide "Video Cerita Produk" — SLIDE_COUNT-1 slide pertama dapat foto
// AI, slide terakhir pakai foto asli user (diedit biar seirama, lihat step 4
// di bawah). Dulu 4 slide, dinaikkan ke 5 (revisi: 4 slide terlalu singkat).
export const CERITA_SLIDE_COUNT = 5;

/**
 * Teks slide + naskah narasi + gambar AI (4 gambar AI + 1 edit foto asli).
 * Dinaikkan dari 4 -> 6 (revisi: total biaya sekarang "6 token untuk 1
 * video seperti ini" — TTS di step berikutnya tetap dihitung terpisah,
 * 1 token/segmen, sesuai biaya ElevenLabs riil).
 */
export const CERITA_STORYBOARD_TOKEN_COST = 6;

type RequestBody = { imageId?: string; imageDescription?: string; theme?: string; language?: "id" | "en" };

type CarouselSlide = { title: string; desc: string };
type CarouselContentData = { slides: CarouselSlide[]; scenes: string[]; caption: string };

/**
 * Validasi + ALASAN GAGAL spesifik (bukan cuma true/false) — supaya kalau AI
 * balikin bentuk salah, log-nya langsung nunjuk field mana yang bermasalah,
 * tidak perlu tebak-tebak dari dump JSON mentah lagi.
 *
 * TOLERAN terhadap KELEBIHAN item: AI kadang balikin scenes/slides 1 LEBIH
 * BANYAK dari yang diminta (mis. 5 scenes padahal diminta 4) — daripada
 * gagal total & user harus klik ulang, kelebihannya DIPOTONG otomatis
 * (ambil N pertama). TETAP GAGAL kalau KURANG dari yang diminta — mengarang
 * slide/scene yang hilang lebih berisiko daripada minta user coba lagi.
 */
function validateCarouselContent(data: Record<string, unknown>): { ok: true; data: CarouselContentData } | { ok: false; reason: string } {
  if (!Array.isArray(data.slides)) return { ok: false, reason: `"slides" bukan array (dapat: ${typeof data.slides})` };
  if (data.slides.length < CERITA_SLIDE_COUNT) {
    return { ok: false, reason: `"slides" isinya ${data.slides.length}, seharusnya ${CERITA_SLIDE_COUNT}` };
  }
  const slides = data.slides.length > CERITA_SLIDE_COUNT ? data.slides.slice(0, CERITA_SLIDE_COUNT) : data.slides;
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!s || typeof s !== "object") return { ok: false, reason: `slides[${i}] bukan object (dapat: ${typeof s})` };
    const slide = s as Record<string, unknown>;
    if (typeof slide.title !== "string" || slide.title.trim().length === 0) {
      return { ok: false, reason: `slides[${i}].title kosong/bukan string (dapat: ${JSON.stringify(slide.title)})` };
    }
    if (typeof slide.desc !== "string") {
      return { ok: false, reason: `slides[${i}].desc bukan string (dapat: ${typeof slide.desc})` };
    }
  }
  if (!Array.isArray(data.scenes)) return { ok: false, reason: `"scenes" bukan array (dapat: ${typeof data.scenes})` };
  const sceneCount = CERITA_SLIDE_COUNT - 1;
  if (data.scenes.length < sceneCount) {
    return { ok: false, reason: `"scenes" isinya ${data.scenes.length}, seharusnya ${sceneCount}` };
  }
  const scenes = data.scenes.length > sceneCount ? data.scenes.slice(0, sceneCount) : data.scenes;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (typeof sc !== "string" || sc.trim().length === 0) {
      return { ok: false, reason: `scenes[${i}] kosong/bukan string (dapat: ${JSON.stringify(sc)})` };
    }
  }
  if (typeof data.caption !== "string" || data.caption.trim().length === 0) {
    return { ok: false, reason: `"caption" kosong/bukan string (dapat: ${JSON.stringify(data.caption)?.slice(0, 200)})` };
  }
  return {
    ok: true,
    data: { slides: slides as CarouselSlide[], scenes: scenes as string[], caption: data.caption },
  };
}

function isSegments(data: Record<string, unknown>): data is { segments: string[] } {
  if (!Array.isArray(data.segments) || data.segments.length !== CERITA_SLIDE_COUNT) return false;
  return data.segments.every((s) => typeof s === "string" && s.trim().length > 0);
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  let body: RequestBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as RequestBody;
  } catch {
    // body kosong tidak apa-apa — semua field opsional
  }
  const language = body.language === "en" ? "en" : "id";
  const imageId = typeof body.imageId === "string" ? body.imageId : "";
  let imageDescription = typeof body.imageDescription === "string" ? body.imageDescription : "";
  const theme = typeof body.theme === "string" ? body.theme : "";

  const token = await consumeTokens(supabase, user.id, CERITA_STORYBOARD_TOKEN_COST, user.email, "Video Cerita Produk - storyboard");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  const authedUser = user;
  async function fail(error: string, status: number, provider?: string) {
    await refundTokens(supabase, authedUser.id, CERITA_STORYBOARD_TOKEN_COST, authedUser.email);
    await logError({
      businessId: authedUser.id,
      route: "video-cerita-storyboard",
      provider,
      error: new Error(error),
      metadata: { status, language },
    });
    return NextResponse.json({ error }, { status });
  }

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return fail(profileResult.error, 502);
  const profile = profileResult.profile;
  if (!profile) return fail("Lengkapi profil bisnis dulu di halaman onboarding.", 400);

  // ── 0) Baca gambar utama (foto slide 4) dulu lewat vision, SEBELUM generate
  //      cerita — supaya subjek cerita = produk yang beneran ada di foto,
  //      bukan cuma deskripsi manual (kadang kosong/generik) atau tebakan dari
  //      profil bisnis. Deskripsi bisnis (target pelanggan, masalah, tone)
  //      tetap dipakai buildCarouselPrompt sebagai KONTEKS arah cerita, tapi
  //      SUBJEK-nya dikunci dari hasil baca gambar ini. Bytes foto ini juga
  //      disimpan (imageBase64/imageMime) buat step 4 di bawah (edit slide 4
  //      biar seirama gaya sama gambar AI 1-3). Best-effort: gagal baca
  //      gambar -> tetap jalan pakai imageDescription apa adanya & slide 4
  //      tetap foto asli tanpa diedit.
  let imageBase64: string | null = null;
  let imageMime = "image/jpeg";
  if (imageId) {
    try {
      const imagesResult = await listImages(supabase, user.id);
      const image = imagesResult.ok ? imagesResult.images.find((img) => img.id === imageId) ?? null : null;
      if (image) {
        const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(image.storage_path);
        if (!error && data) {
          imageMime = (data as Blob).type || "image/jpeg";
          imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
          const seen = await describeProductImage({ imageBase64, mimeType: imageMime, lang: language });
          if (seen.ok && seen.description.trim()) imageDescription = seen.description.trim();
        }
      }
    } catch {
      // best-effort — tetap jalan dengan imageDescription yang ada
    }
  }

  // ── 1) Teks slide + adegan + caption (reuse builder carousel) ────────────
  // Anti-repetisi: larang pola yang sama dengan caption terakhir bisnis ini
  // (best-effort) — supaya cerita "Video Cerita Produk" tidak selalu balik
  // ke tema yang sama (mis. selalu "stok habis") tiap kali digenerate.
  let antiRepetisiBlock = "";
  try {
    const recentCaptions = await getRecentCaptions(supabase, user.id);
    antiRepetisiBlock = buildAntiRepetisiBlock(recentCaptions);
  } catch {
    // best-effort — generate tetap jalan tanpa blok ini
  }
  const contentPrompt = buildCarouselPrompt(profile, imageDescription, theme, language, antiRepetisiBlock, CERITA_SLIDE_COUNT);
  let contentResult = await generateJsonContent(contentPrompt);
  let validated = contentResult.ok ? validateCarouselContent(contentResult.data) : null;
  // Retry OTOMATIS maks 2x kalau bentuk JSON kurang lengkap (mis. jumlah
  // slide kurang) — best-effort, tidak nambah biaya token ke user (token
  // sudah dipotong di awal). Kelebihan item (bukan kekurangan) sudah
  // ditoleransi di validateCarouselContent sendiri (dipotong, bukan gagal),
  // jadi retry di sini cuma buat kasus yang beneran kurang.
  for (let attempt = 1; (!validated || !validated.ok) && attempt <= 2; attempt++) {
    console.error(
      `[video-cerita-storyboard] Percobaan ${attempt} gagal:`,
      contentResult.ok ? (validated?.reason ?? "-") : contentResult.error,
    );
    contentResult = await generateJsonContent(contentPrompt);
    validated = contentResult.ok ? validateCarouselContent(contentResult.data) : null;
  }
  if (!contentResult.ok) return fail(contentResult.error, 502);
  if (!validated || !validated.ok) {
    // Diagnostik: alasan GAGAL spesifik (field mana, bentuk apa) — cek
    // Terminal (npm run dev) kalau ini kejadian lagi.
    const reason = validated?.reason ?? "AI tidak mengembalikan JSON.";
    console.error(`[video-cerita-storyboard] AI JSON tidak cocok skema carousel (2x percobaan): ${reason}`);
    return fail(`AI mengembalikan format cerita tidak lengkap (${reason}). Coba lagi.`, 502);
  }
  const content = validated.data;

  // ── 2) Naskah narasi (1 segmen per slide) dari slide di atas ─────────────
  const narrationResult = await generateJsonContent(
    buildCeritaNarrationPrompt(profile, content.slides, language),
  );
  if (!narrationResult.ok) return fail(narrationResult.error, 502);
  if (!isSegments(narrationResult.data)) {
    return fail("AI mengembalikan format naskah narasi tidak lengkap. Coba lagi.", 502);
  }
  const segments = narrationResult.data.segments;

  // ── 3) Gambar AI slide 1 s/d SLIDE_COUNT-1 — PARALEL (rasio feed) ────────
  // mainProduct dikirim ke prompt gambar supaya AI tahu produk APA yang harus
  // DIHINDARI di adegan-adegan awal (produknya baru boleh muncul di slide
  // terakhir/foto asli user).
  const mainProduct = profile.offering.flagshipProduct || profile.offering.mainProducts;
  const imageResults = await Promise.all(
    content.scenes.map((scene) =>
      generateImage({
        prompt: buildCarouselSceneImagePrompt(scene, language, mainProduct),
        aspectRatio: "9:16",
      }),
    ),
  );
  const failed = imageResults.find((r) => !r.ok);
  if (failed && !failed.ok) return fail(failed.error, 502);

  const imageDataUris = imageResults.map((r) => (r.ok ? r.dataUri : ""));

  // ── 4) Edit foto SLIDE TERAKHIR (foto asli user) SUPAYA SEIRAMA gaya sama
  //      foto-foto AI di atas — pakai foto AI terakhir sebagai referensi gaya
  //      (lighting/mood/warna), produk dari foto asli WAJIB dijaga 100%.
  //      Best-effort: gagal -> lastSlideImageDataUri null, client fallback ke
  //      foto asli apa adanya (perilaku lama).
  let lastSlideImageDataUri: string | null = null;
  if (imageBase64) {
    try {
      const lastScene = imageResults[imageResults.length - 1];
      const refMatch = lastScene.ok ? lastScene.dataUri.match(/^data:([^;,]*);base64,(.+)$/) : null;
      if (refMatch) {
        const [, referenceMime, referenceBase64] = refMatch;
        const edited = await editImageWithReference({
          productBase64: imageBase64,
          productMime: imageMime,
          referenceBase64,
          referenceMime,
          aspectRatio: "9:16",
          prompt: buildCarouselSlide4EditPrompt(content.slides[content.slides.length - 1], language),
        });
        if (edited.ok) lastSlideImageDataUri = edited.dataUri;
      }
    } catch {
      // best-effort — slide terakhir tetap pakai foto asli di client
    }
  }

  return NextResponse.json({
    slides: content.slides,
    segments,
    caption: content.caption,
    imageDataUris, // gambar slide 1 s/d SLIDE_COUNT-1
    lastSlideImageDataUri, // slide terakhir (foto asli, diedit biar seirama) — null kalau gagal, client fallback ke foto asli
    tokensRemaining: token.remaining,
  });
}
