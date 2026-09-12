import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeTokens, refundTokens } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages } from "@/lib/supabase/images";
import { logError } from "@/lib/monitoring/errorLog";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { generateImage, editImage, editImageWithReference } from "@/lib/ai/geminiImage";
import { buildCarouselPrompt, buildCarouselSceneImagePrompt, buildCarouselContinuedSceneImagePrompt, buildCarouselPanoramaPrompt, buildCarouselSlide4EditPrompt } from "@/lib/ai/carouselPrompt";
import { generateWidePanoramaOpenAI } from "@/lib/ai/generateWidePanoramaOpenAI";
import { splitPanoramaInHalf } from "@/lib/images/splitPanorama";

export const runtime = "nodejs";
// 1 panggilan teks + 3 panggilan gambar AI (dijalankan PARALEL supaya total
// waktu tetap ~1 siklus gambar, bukan 3x — penting untuk batas waktu Vercel).
export const maxDuration = 300;

/** Harga fitur Carousel: teks 4 slide + 3 gambar AI = 4 token, dipotong SEKALI.
 * Edit slide 4 (foto asli user diseiramakan gaya) TIDAK menambah biaya token —
 * sama seperti pola di Video Cerita Produk, biaya editnya kecil (~1 panggilan
 * gambar) dan sudah "termasuk" di 4 token ini. */
export const CAROUSEL_TOKEN_COST = 4;

const BUCKET = "user-images";

type RequestBody = { imageId?: string; imageDescription?: string; theme?: string; language?: "id" | "en"; chainedStory?: boolean; panorama4?: boolean };

type CarouselSlide = { title: string; desc: string };
type CarouselContentData = { slides: CarouselSlide[]; scenes: string[]; caption: string };

function isCarouselContent(data: Record<string, unknown>, expectedSlideCount: number): data is CarouselContentData {
  if (!Array.isArray(data.slides) || data.slides.length !== expectedSlideCount) return false;
  for (const s of data.slides) {
    if (!s || typeof s !== "object") return false;
    const slide = s as Record<string, unknown>;
    if (typeof slide.title !== "string" || slide.title.trim().length === 0) return false;
    if (typeof slide.desc !== "string") return false;
  }
  if (!Array.isArray(data.scenes) || data.scenes.length !== expectedSlideCount - 1) return false;
  if (!data.scenes.every((sc) => typeof sc === "string" && sc.trim().length > 0)) return false;
  if (typeof data.caption !== "string" || data.caption.trim().length === 0) return false;
  return true;
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
      { status: 503 },
    );
  }

  let body: RequestBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as RequestBody;
  } catch {
    // body kosong tidak apa-apa — semua field opsional
  }
  const language = body.language === "en" ? "en" : "id";
  const imageId = typeof body.imageId === "string" ? body.imageId : "";
  const imageDescription = typeof body.imageDescription === "string" ? body.imageDescription : "";
  const theme = typeof body.theme === "string" ? body.theme : "";
  // EKSPERIMENTAL — mode "cerita berantai": slide 2 digenerate dengan foto
  // slide 1 sebagai referensi (orang/tempat/kondisi konsisten), slide 3
  // dengan foto slide 2 sebagai referensi. Slide 4 TETAP foto asli user
  // seperti biasa (tidak berubah).
  const chainedStory = body.chainedStory === true;
  const panorama4 = !chainedStory && body.panorama4 === true; // saling eksklusif, chainedStory menang kalau dua-duanya somehow true

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const token = await consumeTokens(supabase, user.id, CAROUSEL_TOKEN_COST, user.email, "Carousel");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  // Token sudah dipotong. SEMUA jalur gagal setelah ini wajib lewat fail()
  // supaya token dikembalikan penuh (pelajaran bug token hangus di Otomatis).
  const authedUser = user;
  async function fail(error: string, status: number, provider?: string) {
    await refundTokens(supabase, authedUser.id, CAROUSEL_TOKEN_COST, authedUser.email);
    await logError({
      businessId: authedUser.id,
      route: "generate-carousel",
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

  // ── 1) Teks N slide + (N-1) adegan + caption (satu panggilan JSON) ───────
  // Mode panorama SEKARANG 3 slide (bukan 4) — sumber panorama (rasio wide)
  // TIDAK bisa dibagi bersih jadi 4 potret 4:5 tanpa bantalan besar, tapi
  // BISA dibagi bersih jadi 3 KOTAK 1:1 (terbukti lewat percobaan user:
  // panorama 3240x1080 ÷ 3 = persis 1080x1080, tanpa sisa/bantalan sama sekali).
  const slideCount = panorama4 ? 3 : 4;
  const contentResult = await generateJsonContent(
    buildCarouselPrompt(profile, imageDescription, theme, language, undefined, slideCount),
  );
  if (!contentResult.ok) return fail(contentResult.error, 502);
  if (!isCarouselContent(contentResult.data, slideCount)) {
    return fail("AI mengembalikan format carousel tidak lengkap. Coba lagi.", 502);
  }
  const content = contentResult.data;

  // ── 2) Gambar slide 1-4 — 3 mode: NORMAL (paralel), "cerita berantai"
  //      (berurutan, tiap slide foto utuh), atau "panorama dipotong 4"
  //      (1 generate untuk seluruh cerita, foto asli jadi INPUT langsung).
  const mainProduct = profile.offering.flagshipProduct || profile.offering.mainProducts;

  // Ambil foto produk ASLI sekali di awal (dipakai slide 4 di SEMUA mode,
  // dan sebagai INPUT generate di mode panorama4 — bukan cuma referensi
  // belakangan). Best-effort: gagal -> tetap lanjut, slide 4 fallback ke
  // foto asli apa adanya di client (perilaku lama, tidak fatal).
  let productPhoto: { base64: string; mimeType: string } | null = null;
  if (imageId) {
    try {
      const imagesResult = await listImages(supabase, user.id);
      const image = imagesResult.ok ? imagesResult.images.find((img) => img.id === imageId) ?? null : null;
      if (image) {
        const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(image.storage_path);
        if (!error && data) {
          const mimeType = (data as Blob).type || "image/jpeg";
          const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
          productPhoto = { base64, mimeType };
        }
      }
    } catch {
      // best-effort
    }
  }

  let imageDataUris: string[];
  let lastSlideImageDataUri: string | null = null;

  if (panorama4) {
    // ── EKSPERIMENTAL: panorama dipotong 2 (BUKAN 3) — dihitung ulang:
    //    kalau ukuran custom "3240x1080" ditolak server & fallback ke
    //    "1536x1024" resmi, bagi 2 kasih 75% konten terisi vs bagi 3 cuma
    //    50% — jauh lebih baik. Slide ke-3 (produk) TIDAK lagi dari bagian
    //    panorama yang "disisakan kosong" — sekarang dibuat lewat langkah
    //    SEPARATE yang SAMA seperti mode lain (foto asli + referensi gaya
    //    dari bagian terakhir yang sudah ada), lihat blok bersama di bawah.
    const slideDescs: [string, string] = [content.slides[0].desc, content.slides[1].desc];
    const panoramaPrompt = buildCarouselPanoramaPrompt(slideDescs, language, mainProduct);
    const panorama = await generateWidePanoramaOpenAI(panoramaPrompt, null);
    if (!panorama.ok) return fail(panorama.error, 502);

    const [part1, part2] = await splitPanoramaInHalf(panorama.dataUri);
    imageDataUris = [part1, part2];
    // lastSlideImageDataUri masih null di sini — DIISI di blok bersama "edit
    // slide terakhir" di bawah (sama seperti mode lain), pakai part2 sebagai
    // referensi gaya. Kalau tidak ada foto produk asli, client fallback ke
    // part2 sendiri (lihat catatan di respons JSON).
  } else if (chainedStory) {
    // ── EKSPERIMENTAL: cerita berantai — tiap slide TETAP foto utuh &
    //    bermakna sendiri, TAPI digenerate SATU-SATU BERURUTAN (bukan
    //    paralel — slide 2 butuh hasil slide 1 dulu sebagai referensi,
    //    slide 3 butuh hasil slide 2), supaya orang/tempat/kondisinya
    //    konsisten seperti halaman-halaman di buku cerita yang sama.
    //    KONSEKUENSI: total waktu generate lebih lama dari mode biasa
    //    (3 panggilan gambar berurutan, bukan paralel) — lihat maxDuration.
    const scene1 = await generateImage({
      prompt: buildCarouselSceneImagePrompt(content.scenes[0], language, mainProduct),
      aspectRatio: "4:5",
    });
    if (!scene1.ok) return fail(scene1.error, 502);

    const scene1Match = scene1.dataUri.match(/^data:([^;,]*);base64,(.+)$/);
    if (!scene1Match) return fail("Gagal membaca hasil gambar slide 1.", 502);
    const scene2 = await editImage({
      imageBase64: scene1Match[2],
      mimeType: scene1Match[1],
      aspectRatio: "4:5",
      prompt: buildCarouselContinuedSceneImagePrompt(content.scenes[1], language, mainProduct),
    });
    if (!scene2.ok) return fail(scene2.error, 502);

    const scene2Match = scene2.dataUri.match(/^data:([^;,]*);base64,(.+)$/);
    if (!scene2Match) return fail("Gagal membaca hasil gambar slide 2.", 502);
    const scene3 = await editImage({
      imageBase64: scene2Match[2],
      mimeType: scene2Match[1],
      aspectRatio: "4:5",
      prompt: buildCarouselContinuedSceneImagePrompt(content.scenes[2], language, mainProduct),
    });
    if (!scene3.ok) return fail(scene3.error, 502);

    imageDataUris = [scene1.dataUri, scene2.dataUri, scene3.dataUri];
  } else {
    // ── Jalur LAMA, TIDAK BERUBAH — 3 gambar PARALEL, independen ─────────
    const imageResults = await Promise.all(
      content.scenes.map((scene) =>
        generateImage({
          prompt: buildCarouselSceneImagePrompt(scene, language, mainProduct),
          aspectRatio: "4:5",
        }),
      ),
    );
    const failedImg = imageResults.find((r) => !r.ok);
    if (failedImg && !failedImg.ok) return fail(failedImg.error, 502);
    imageDataUris = imageResults.map((r) => (r.ok ? r.dataUri : ""));
  }

  // ── Edit foto SLIDE TERAKHIR (foto asli user) SUPAYA SEIRAMA gaya sama
  //    foto-foto AI di atas — SAMA di SEMUA mode (termasuk panorama4
  //    sekarang, tidak ada percabangan khusus lagi — imageDataUris selalu
  //    berisi bagian/slide TERAKHIR yang sudah ada di posisi paling akhir,
  //    dipakai sebagai referensi gaya). Best-effort: gagal -> null, client
  //    fallback ke foto asli apa adanya.
  if (productPhoto) {
    try {
      const referenceForSlide4 = imageDataUris[imageDataUris.length - 1];
      const refMatch = referenceForSlide4 ? referenceForSlide4.match(/^data:([^;,]*);base64,(.+)$/) : null;
      if (refMatch) {
        const [, referenceMime, referenceBase64] = refMatch;
        const edited = await editImageWithReference({
          productBase64: productPhoto.base64,
          productMime: productPhoto.mimeType,
          referenceBase64,
          referenceMime,
          aspectRatio: panorama4 ? "1:1" : "4:5",
          prompt: buildCarouselSlide4EditPrompt(content.slides[content.slides.length - 1], language, panorama4 ? "1:1" : "4:5"),
        });
        if (edited.ok) lastSlideImageDataUri = edited.dataUri;
      }
    } catch {
      // best-effort — slide 4 tetap pakai hasil sebelumnya (foto asli/bagian kosong) di client
    }
  }

  // TIDAK insert ke Riwayat di sini — konten masuk Riwayat hanya saat user
  // menekan Simpan (pola yang sama dengan Buat Konten manual).
  return NextResponse.json({
    slides: content.slides,
    caption: content.caption,
    imageDataUris, // gambar slide 1, 2, 3
    lastSlideImageDataUri, // slide 4 — foto asli user, diseiramakan gaya (mode normal/chained) atau dianyam langsung (mode panorama4)
    chainedStory,
    panorama4,
    tokensRemaining: token.remaining,
  });
}
