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
import { buildCarouselPrompt, buildCarouselSceneImagePrompt, buildCarouselSlide4EditPrompt } from "@/lib/ai/carouselPrompt";

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

type RequestBody = { imageId?: string; imageDescription?: string; theme?: string; language?: "id" | "en" };

type CarouselSlide = { title: string; desc: string };
type CarouselContentData = { slides: CarouselSlide[]; scenes: string[]; caption: string };

function isCarouselContent(data: Record<string, unknown>): data is CarouselContentData {
  if (!Array.isArray(data.slides) || data.slides.length !== 4) return false;
  for (const s of data.slides) {
    if (!s || typeof s !== "object") return false;
    const slide = s as Record<string, unknown>;
    if (typeof slide.title !== "string" || slide.title.trim().length === 0) return false;
    if (typeof slide.desc !== "string") return false;
  }
  if (!Array.isArray(data.scenes) || data.scenes.length !== 3) return false;
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

  // ── 1) Teks 4 slide + 3 adegan + caption (satu panggilan JSON) ───────────
  const contentResult = await generateJsonContent(
    buildCarouselPrompt(profile, imageDescription, theme, language),
  );
  if (!contentResult.ok) return fail(contentResult.error, 502);
  if (!isCarouselContent(contentResult.data)) {
    return fail("AI mengembalikan format carousel tidak lengkap. Coba lagi.", 502);
  }
  const content = contentResult.data;

  // ── 2) Gambar AI slide 1-3 — PARALEL (rasio feed) ────────────────────────
  // mainProduct dikirim ke prompt gambar supaya AI tahu produk APA yang harus
  // DIHINDARI di adegan 1-3 (produknya baru boleh muncul di slide 4/penutup).
  const mainProduct = profile.offering.flagshipProduct || profile.offering.mainProducts;
  const imageResults = await Promise.all(
    content.scenes.map((scene) =>
      generateImage({
        prompt: buildCarouselSceneImagePrompt(scene, language, mainProduct),
        aspectRatio: "4:5", // carousel = potret 4:5 (1080x1350, ukuran feed IG terbaik)
      }),
    ),
  );
  const failed = imageResults.find((r) => !r.ok);
  if (failed && !failed.ok) return fail(failed.error, 502);

  const imageDataUris = imageResults.map((r) => (r.ok ? r.dataUri : ""));

  // ── 3) Edit foto SLIDE 4 (foto asli user) SUPAYA SEIRAMA gaya sama foto-foto
  //      AI di atas — pakai foto AI terakhir sebagai referensi gaya
  //      (lighting/mood/warna), produk dari foto asli WAJIB dijaga 100%.
  //      Best-effort: gagal (foto tidak ketemu / AI gagal) -> null, client
  //      fallback ke foto asli apa adanya (perilaku lama, tidak fatal).
  let lastSlideImageDataUri: string | null = null;
  if (imageId) {
    try {
      const supabaseForImages = supabase;
      const imagesResult = await listImages(supabaseForImages, user.id);
      const image = imagesResult.ok ? imagesResult.images.find((img) => img.id === imageId) ?? null : null;
      if (image) {
        const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(image.storage_path);
        if (!error && data) {
          const productMime = (data as Blob).type || "image/jpeg";
          const productBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
          const lastScene = imageResults[imageResults.length - 1];
          const refMatch = lastScene.ok ? lastScene.dataUri.match(/^data:([^;,]*);base64,(.+)$/) : null;
          if (refMatch) {
            const [, referenceMime, referenceBase64] = refMatch;
            const edited = await editImageWithReference({
              productBase64,
              productMime,
              referenceBase64,
              referenceMime,
              aspectRatio: "4:5",
              prompt: buildCarouselSlide4EditPrompt(content.slides[content.slides.length - 1], language, "4:5"),
            });
            if (edited.ok) lastSlideImageDataUri = edited.dataUri;
          }
        }
      }
    } catch {
      // best-effort — slide 4 tetap pakai foto asli di client
    }
  }

  // TIDAK insert ke Riwayat di sini — konten masuk Riwayat hanya saat user
  // menekan Simpan (pola yang sama dengan Buat Konten manual).
  return NextResponse.json({
    slides: content.slides,
    caption: content.caption,
    imageDataUris, // gambar slide 1, 2, 3
    lastSlideImageDataUri, // slide 4 (foto asli, diedit biar seirama) — null kalau gagal, client fallback ke foto asli
    tokensRemaining: token.remaining,
  });
}
