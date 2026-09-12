import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeToken, refundToken, consumeTokens, isAdmin } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages, publicImageUrl, type ImageRow } from "@/lib/supabase/images";
import { logError } from "@/lib/monitoring/errorLog";
import { describeProductImage } from "@/lib/ai/describeImage";
import {
  insertGeneratedContent,
  listGeneratedContent,
  type GeneratedContentJenis,
} from "@/lib/supabase/generatedContent";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { polosTemplate } from "@/lib/templates/polos";
import { interaksiTemplate } from "@/lib/templates/interaksi";
// renderTemplate dimuat dinamis saat POST (agar sharp tidak crash module saat startup)
import { buildScenePrompt, buildRuanganPrompt, buildOrangPrompt, buildSoftwarePrompt, buildSkincarePrompt, buildFoodPrompt, buildGabungPrompt, buildReferencePrompt } from "@/lib/ai/scenePrompt";
import { editImage, generateImage, composeProducts, editImageWithReference } from "@/lib/ai/geminiImage";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { notesPromptBlock } from "@/lib/ai/checkinPrompt";
import { getRecentCaptions, buildAntiRepetisiBlock } from "@/lib/ai/antiRepetisi";
import { sanitizeTitle } from "@/lib/ai/sanitizeTitle";
import { runFullDesignPipeline } from "@/lib/ai/fullDesignPipeline";
import { traceFullDesign } from "@/lib/ai/fullDesignTracing";
import { callGeminiVisionForLayout } from "@/lib/ai/geminiVisionText";
import type { Template } from "@/lib/templates/types";
import { buildMomenBlock } from "@/lib/ai/momenKalender";
import {
  buildGeneralContentPrompt,
  buildGeneralCaptionForTitlePrompt,
  buildInteraksiContentPrompt,
  buildInteraksiCaptionForTitlePrompt,
  pickInteraksiFormat,
  findInteraksiFormatByLabel,
  buildProdukContentPrompt,
  buildProdukCaptionForTitlePrompt,
  buildGabungContentPrompt,
  themeInstruction,
  themeImageNote,
} from "@/lib/ai/autoContentPrompt";
import { buildGeneralImagePrompt, buildInteraksiImagePrompt } from "@/lib/ai/autoImagePrompt";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import type { AspectRatio } from "@/lib/templates/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Naikkan batas waktu route handler — Gemini image bisa butuh 90–120 detik.
export const maxDuration = 300;

const VALID_RATIOS: AspectRatio[] = ["4:5", "1:1", "9:16"];
const VALID_JENIS: GeneratedContentJenis[] = ["produk", "general", "interaksi"];
const BUCKET = "user-images";

function envErrorResponse() {
  return NextResponse.json(
    { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
    { status: 503 },
  );
}

export async function GET() {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) return envErrorResponse();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const result = await listGeneratedContent(supabase, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  const serviceClient = createServiceRoleClient();
  const items = result.rows.map((row) => {
    // background_path mungkin ada (konten baru) atau tidak ada (konten lama)
    const bgRow = row as typeof row & { background_path?: string | null };
    return {
      id: row.id,
      jenis: row.jenis,
      imageUrl: publicImageUrl(supabase, row.storage_path),
      backgroundUrl: bgRow.background_path
        ? publicImageUrl(serviceClient, bgRow.background_path)
        : undefined,
      onImageText: row.on_image_text,
      caption: row.caption,
      ratio: row.ratio,
      status: row.status,
      layoutState: (row as typeof row & { layout_state?: unknown }).layout_state ?? null,
      scheduledDate: (row as typeof row & { scheduled_date?: string | null }).scheduled_date ?? null,
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ items });
}

const VALID_TEMA = ["hook", "edukasi", "produk", "promo"] as const;
type ContentTema = (typeof VALID_TEMA)[number];

type RequestBody = { jenis: GeneratedContentJenis; ratio: AspectRatio; imageId?: string; imageIds?: string[]; language?: "id" | "en"; referenceDataUri?: string; tema?: ContentTema; konsep?: string; lockedTitle?: string; produkDescOverride?: string; formatLabel?: string; useArtDirector?: boolean; useTracing?: boolean };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidBody(body: unknown): body is RequestBody {
  if (!isRecord(body)) return false;
  if (typeof body.jenis !== "string" || !VALID_JENIS.includes(body.jenis as GeneratedContentJenis)) return false;
  if (typeof body.ratio !== "string" || !VALID_RATIOS.includes(body.ratio as AspectRatio)) return false;
  if (body.imageId !== undefined && typeof body.imageId !== "string") return false;
  if (body.imageIds !== undefined) {
    if (!Array.isArray(body.imageIds) || body.imageIds.length < 1 || body.imageIds.length > 5) return false;
    if (!body.imageIds.every((x) => typeof x === "string")) return false;
  }
  if (body.referenceDataUri !== undefined && typeof body.referenceDataUri !== "string") return false;
  if (body.tema !== undefined && !VALID_TEMA.includes(body.tema as ContentTema)) return false;
  if (body.konsep !== undefined && (typeof body.konsep !== "string" || body.konsep.length > 500)) return false;
  if (body.lockedTitle !== undefined && (typeof body.lockedTitle !== "string" || body.lockedTitle.length > 200)) return false;
  if (body.produkDescOverride !== undefined && typeof body.produkDescOverride !== "string") return false;
  if (body.formatLabel !== undefined && typeof body.formatLabel !== "string") return false;
  if (body.useArtDirector !== undefined && typeof body.useArtDirector !== "boolean") return false;
  if (body.useTracing !== undefined && typeof body.useTracing !== "boolean") return false;
  return true;
}

type AutoContent = { onImageText: string; caption: string; imageScene?: string; fontId?: string; jawaban?: string };

function isAutoContent(data: Record<string, unknown>, requireScene: boolean): data is AutoContent {
  if (typeof data.onImageText !== "string" || data.onImageText.trim().length === 0) return false;
  if (typeof data.caption !== "string" || data.caption.trim().length === 0) return false;
  if (requireScene && (typeof data.imageScene !== "string" || data.imageScene.trim().length === 0)) return false;
  return true;
}

/** Konversi data URI base64 ke Buffer PNG */
function dataUriToBuffer(dataUri: string): Buffer {
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64, "base64");
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) return envErrorResponse();

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 }); }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "jenis dan ratio wajib diisi dengan nilai yang valid." }, { status: 400 });
  }
  const selectedImageIds =
    body.imageIds && body.imageIds.length ? body.imageIds : body.imageId ? [body.imageId] : [];
  if (body.jenis === "produk" && selectedImageIds.length === 0) {
    return NextResponse.json({ error: "Pilih minimal satu gambar produk dulu." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const token = await consumeToken(supabase, user.id, user.email, "Otomatis");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

// Token sudah dipotong di atas. Kalau ada langkah berikutnya yang gagal,
  // kembalikan tokennya lewat helper ini alih-alih NextResponse langsung.
  const authedUser = user;
  async function fail(error: string, status: number, provider?: string) {
    await refundToken(supabase, authedUser.id, authedUser.email);
    await logError({
      businessId: authedUser.id,
      route: "generate-auto",
      provider,
      error: new Error(error),
      metadata: { status, jenis: (body as RequestBody).jenis, ratio: (body as RequestBody).ratio },
    });
    return NextResponse.json({ error }, { status });
  }

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return fail(profileResult.error, 502);
  const profile = profileResult.profile;
  if (!profile) {
    return fail("Lengkapi profil bisnis dulu di halaman onboarding.", 400);
  }

  let sourceImage: ImageRow | null = null;
  const sourceImages: ImageRow[] = [];
  if (body.jenis === "produk") {
    const imagesResult = await listImages(supabase, user.id);
    if (!imagesResult.ok) return fail(imagesResult.error, 502);
    const ALLOWED_CATEGORIES = ["Produk", "Makanan/Minuman", "Kecantikan/Skincare", "Software/Website", "Wajah/Orang", "Suasana/Fasilitas"];
    for (const id of selectedImageIds) {
      const image = imagesResult.images.find((img) => img.id === id) ?? null;
      const allowed = image && ALLOWED_CATEGORIES.includes(image.category);
      if (!image || !allowed || image.usage !== "olah_ai") {
        return fail("Gambar tidak ditemukan atau bukan gambar yang boleh diolah AI.", 400);
      }
      sourceImages.push(image);
    }
    sourceImage = sourceImages[0] ?? null;
  }

  // Gabung produk aktif kalau user memilih lebih dari satu foto produk.
  const isGabung = body.jenis === "produk" && sourceImages.length > 1;

  // ── Kenali produk dari FOTO (vision) kalau deskripsi user kosong/minim ──
  // Judul & caption dibuat SEBELUM gambar; tanpa ini AI hanya pegang profil
  // bisnis dan bisa salah sebut produk (kasus nyata: toko "botolmakassar"
  // generate foto GELAS → judul menyebut BOTOL). describeProductImage sudah
  // terbukti di /coba — di sini dipakai best-effort: gagal → jalan seperti
  // biasa dengan deskripsi apa adanya. Foto yang sudah diunduh dipakai ulang
  // untuk editImage di bawah (tidak download 2x).
  let produkDesc = body.produkDescOverride?.trim() || sourceImage?.description || "";
  let produkBase64: string | null = null;
  let produkMime = "image/jpeg";
  // Kalau produkDescOverride sudah dikirim (dari step popup 5-judul, yang
  // sudah lebih dulu jalanin describeProductImage), SKIP vision-AI di sini —
  // hemat 1 panggilan API yang sama persis, bukan cuma soal cepat tapi juga
  // soal biaya (dipanggil 2x kalau tidak di-skip).
  if (body.jenis === "produk" && !isGabung && sourceImage && !body.produkDescOverride?.trim() && produkDesc.trim().length < 12) {
    try {
      const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(sourceImage.storage_path);
      if (!error && data) {
        produkMime = (data as Blob).type || "image/jpeg";
        produkBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
        const seen = await describeProductImage({
          imageBase64: produkBase64,
          mimeType: produkMime,
          lang: body.language === "en" ? "en" : "id",
          industry: profile.business.industry,
        });
        if (seen.ok && seen.description.trim()) produkDesc = seen.description.trim();
      }
    } catch {
      // best-effort — deskripsi tetap yang lama
    }
  }

  // ── Catatan bisnis dari AI Check-in (tahap uji, khusus admin) ────────────
  // Disuntik ke prompt teks sbg "kabar terbaru pemilik" agar topik konten
  // mengikuti kondisi usaha terkini. Best-effort: tabel belum ada / kosong →
  // blok kosong, generate jalan normal.
  let notesBlock = "";
  if (isAdmin(user.email)) {
    try {
      const { data: notesData } = await supabase
        .from("business_notes")
        .select("note, created_at")
        .eq("business_id", user.id)
        .order("created_at", { ascending: false })
        .limit(7);
      notesBlock = notesPromptBlock(notesData ?? []);
    } catch {
      // best-effort
    }
  }

  // ── Anti-repetisi: 12 caption terakhir jadi larangan pola (best-effort) ──
  let antiRepetisiBlock = "";
  try {
    const recentCaptions = await getRecentCaptions(supabase, user.id);
    antiRepetisiBlock = buildAntiRepetisiBlock(recentCaptions);
  } catch {
    // best-effort — generate tetap jalan tanpa blok ini
  }

  // ── Kalender momen Indonesia (WIB = UTC+7; server Vercel jalan di UTC).
  // Hanya utk output Indonesia — momennya spesifik Indonesia.
  const momenBlock =
    body.language === "en" ? "" : buildMomenBlock(new Date(Date.now() + 7 * 60 * 60 * 1000));

  // ── Generate teks (headline + caption + fontId) ──────────────────────────
  // Tema (Hook/Edukasi/Penjelasan Produk/Promo): kalau dipilih, suntik
  // instruksi gaya lewat param `extra`. HANYA utk produk/gabung/general —
  // Interaksi punya format sendiri (kuis/quote/tips) dan tidak ikut tema.
  // Anti-repetisi & momen berlaku SEMUA jenis. Carousel punya alur terpisah.
  //
  // KONSEP (field baru, opsional, ditulis bebas oleh user): kalau diisi,
  // JADI PRIORITAS UTAMA — mengalahkan tema & pendekatan default (data
  // produk/bisnis onboarding tetap dipakai sebagai KONTEKS, tapi arah
  // kreatifnya ngikutin konsep ini). Kalau kosong, perilaku lama (tema atau
  // default berbasis data produk/bisnis) tetap jalan tanpa berubah.
  const konsepText = body.konsep?.trim();
  // Instruksi konsep utk produk (baik jalur langsung maupun caption-setelah-
  // judul-terkunci) sekarang dibangun DI DALAM buildProdukContentPrompt /
  // buildProdukCaptionForTitlePrompt sendiri (konsepDecisionBlock) — bukan
  // digabung ke extraAll lagi. Alasan: kalimat pembuka fungsi2 itu ("Produk =
  // BINTANG UTAMA") ternyata PREMIS FONDASI yang lebih kuat drpd instruksi
  // konsep yang cuma ditambahkan belakangan, jadi pembukanya sendiri sekarang
  // dibuat kondisional. Utk jalur GABUNG (multi-foto, > 1 gambar dipilih)
  // tetap pakai cara lama (konsepExtra biasa) — fungsi buildGabungContentPrompt
  // belum di-upgrade ke pola yang sama, jangan sampai kehilangan konsep sama
  // sekali di jalur itu.
  const konsepExtraLegacy = konsepText
    ? (body.language === "en"
        ? `PRIORITY CONCEPT (from the user, OVERRIDES the theme/default direction below if they conflict): "${konsepText}"\nStill ground the content in the real product/business data above — the concept sets the CREATIVE DIRECTION, it doesn't replace real facts with invented ones.`
        : `KONSEP PRIORITAS (dari user, MENGALAHKAN tema/arah default di bawah kalau bertentangan): "${konsepText}"\nTetap berpijak pada data produk/bisnis asli di atas — konsep ini menentukan ARAH KREATIFNYA, bukan mengganti fakta asli dengan karangan.`)
    : undefined;
  const temaExtra = body.tema ? themeInstruction(body.tema, body.language) : undefined;
  const sharedExtra = [antiRepetisiBlock, momenBlock].filter(Boolean).join("\n");
  const extraGabung = [konsepExtraLegacy, temaExtra, sharedExtra].filter(Boolean).join("\n") || undefined;
  const extraProdukOnly = [temaExtra, sharedExtra].filter(Boolean).join("\n") || undefined;
  const extraGeneralOnly = sharedExtra || undefined; // konsep utk general lewat param dedicated (lihat bawah)
  const extraInteraksi = sharedExtra || undefined;
  const lockedTitle = body.lockedTitle?.trim();
  // Kalau user sudah pilih judul dari popup "5 pilihan judul" — jangan
  // generate judul baru, cuma minta CAPTION (+jawaban/imageScene sesuai
  // jenisnya) yang nyambung ke judul itu. Produk: cuma utk foto TUNGGAL
  // (bukan gabung/carousel). Interaksi: format (Kuis/Edukasi/dst) yang
  // sudah dikunci dari tahap /titles WAJIB dipakai ulang PERSIS sama —
  // dicari via label yang dikirim balik client, fallback ke pilih acak baru
  // kalau labelnya tidak ketemu (jaga2 kalau ada mismatch versi).
  const isLockedProduk = !!lockedTitle && body.jenis === "produk" && !isGabung;
  const isLockedGeneral = !!lockedTitle && body.jenis === "general";
  const isLockedInteraksi = !!lockedTitle && body.jenis === "interaksi";
  const lockedInteraksiFormat = isLockedInteraksi
    ? (body.formatLabel ? findInteraksiFormatByLabel(body.formatLabel, body.language) : undefined) ?? pickInteraksiFormat(body.language)
    : undefined;

  const contentPrompt = (
    isLockedProduk ? buildProdukCaptionForTitlePrompt(profile, produkDesc, lockedTitle!, body.language, extraProdukOnly, konsepText)
    : isLockedGeneral ? buildGeneralCaptionForTitlePrompt(profile, lockedTitle!, body.language, extraGeneralOnly, konsepText)
    : isLockedInteraksi ? buildInteraksiCaptionForTitlePrompt(profile, lockedInteraksiFormat!, lockedTitle!, body.language, extraInteraksi)
    : isGabung ? buildGabungContentPrompt(profile, sourceImages.map((s) => s.description ?? ""), body.language, extraGabung)
    : body.jenis === "produk" ? buildProdukContentPrompt(profile, produkDesc, body.language, extraProdukOnly, konsepText)
    : body.jenis === "general" ? buildGeneralContentPrompt(profile, body.language, extraGeneralOnly, konsepText)
    : buildInteraksiContentPrompt(profile, body.language, extraInteraksi)
  ) + notesBlock;

  const contentResult = await generateJsonContent(contentPrompt);
  if (!contentResult.ok) return fail(contentResult.error, 502);

  const requireScene = body.jenis !== "produk";
  let content: AutoContent;
  if (isLockedProduk) {
    // Prompt caption-only cuma minta {"caption","fontId"} — onImageText
    // TIDAK diminta AI, langsung pakai judul yang sudah dipilih user.
    const capData = contentResult.data as { caption?: unknown; fontId?: unknown };
    if (typeof capData.caption !== "string" || capData.caption.trim().length === 0) {
      return fail("AI mengembalikan format caption tidak lengkap. Coba lagi.", 502);
    }
    content = { onImageText: lockedTitle!, caption: capData.caption, fontId: typeof capData.fontId === "string" ? capData.fontId : undefined };
  } else if (isLockedGeneral) {
    const capData = contentResult.data as { caption?: unknown; imageScene?: unknown; fontId?: unknown };
    if (typeof capData.caption !== "string" || capData.caption.trim().length === 0 || typeof capData.imageScene !== "string" || capData.imageScene.trim().length === 0) {
      return fail("AI mengembalikan format konten tidak lengkap. Coba lagi.", 502);
    }
    content = { onImageText: lockedTitle!, caption: capData.caption, imageScene: capData.imageScene, fontId: typeof capData.fontId === "string" ? capData.fontId : undefined };
  } else if (isLockedInteraksi) {
    const capData = contentResult.data as { caption?: unknown; jawaban?: unknown; imageScene?: unknown; fontId?: unknown };
    if (typeof capData.caption !== "string" || capData.caption.trim().length === 0 || typeof capData.imageScene !== "string" || capData.imageScene.trim().length === 0) {
      return fail("AI mengembalikan format konten tidak lengkap. Coba lagi.", 502);
    }
    content = {
      onImageText: lockedTitle!, caption: capData.caption, imageScene: capData.imageScene,
      jawaban: typeof capData.jawaban === "string" ? capData.jawaban : undefined,
      fontId: typeof capData.fontId === "string" ? capData.fontId : undefined,
    };
  } else {
    if (!isAutoContent(contentResult.data, requireScene)) {
      return fail("AI mengembalikan format konten tidak lengkap. Coba lagi.", 502);
    }
    content = contentResult.data;
    // Jaring pengaman: judul AI (bukan judul kunci yg dipilih user) bisa saja
    // masih menyelipkan "--"/"—" walau prompt sudah melarang — rapikan di sini.
    content.onImageText = sanitizeTitle(content.onImageText);
  }
  const fontOption = content.fontId ? FONT_OPTIONS.find((f) => f.id === content.fontId) : null;

  // ── Generate gambar bersih (tanpa overlay) ───────────────────────────────
  let imageDataUri: string;
  if (isGabung) {
    // Ambil semua foto produk terpilih → base64, lalu minta AI menggabung.
    const images: { imageBase64: string; mimeType: string }[] = [];
    try {
      for (const img of sourceImages) {
        // Baca foto sumber via SERVICE client (tembus bucket privat/RLS), bukan
        // fetch URL publik yang bisa gagal → akar bug storage.
        const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(img.storage_path);
        if (error || !data) throw new Error(error?.message ?? "download gagal");
        const mt = (data as Blob).type || "image/jpeg";
        const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
        images.push({ imageBase64: b64, mimeType: mt });
      }
    } catch {
      return fail("Gagal mengambil salah satu gambar produk.", 502);
    }
    const prompt = buildGabungPrompt(profile, sourceImages.map((s) => s.description ?? ""), body.language);
    const result = await composeProducts({ images, aspectRatio: body.ratio, prompt });
    if (!result.ok) return fail(result.error, 502);
    imageDataUri = result.dataUri;
  } else if (body.jenis === "produk") {
    if (!sourceImage) return fail("Pilih gambar produk dulu.", 400);
    let imageBase64: string; let mimeType: string;
    if (produkBase64) {
      // Sudah diunduh saat kenali-produk di atas — pakai ulang.
      imageBase64 = produkBase64; mimeType = produkMime;
    } else {
    try {
      const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(sourceImage.storage_path);
      if (error || !data) throw new Error(error?.message ?? "download gagal");
      mimeType = (data as Blob).type || "image/jpeg";
      imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    } catch {
      return fail("Gagal mengambil gambar produk.", 502);
    }
    }
    // Sambungkan judul yang sudah digenerate ke prompt gambar — supaya
    // adegan konsisten dgn topik konten (mis. judul soal menyimpan bawang
    // goreng → adegan dapur, bukan kafe).
    const headlineNote = content.onImageText?.trim()
      ? `\n\nCONTENT HEADLINE that will be overlaid on this image: "${content.onImageText.trim()}" — if it implies a usage moment, activity, or place, keep the scene consistent with it (never contradict it).`
      : "";
    const temaImageNote = body.tema ? themeImageNote(body.tema, body.language) : "";
    const konsepImageNote = konsepText
      ? (body.language === "en"
          ? `\n\nPRIORITY CONCEPT for this scene (from the user, overrides default styling if it conflicts): "${konsepText}"\nIf this concept describes a standalone situation/event/moment, depict THAT situation — the product does not have to be the visual focus (or even present) if the concept doesn't call for it.`
          : `\n\nKONSEP PRIORITAS untuk adegan ini (dari user, mengalahkan gaya default kalau bertentangan): "${konsepText}"\nKalau konsep ini menggambarkan situasi/peristiwa/momen yang berdiri sendiri, gambarkan SITUASI itu — produk tidak wajib jadi fokus visual (atau bahkan tidak wajib muncul) kalau konsepnya memang tidak menuntut itu.`)
      : "";
    const prompt = (
      sourceImage.type === "makanan" ? buildFoodPrompt(profile, produkDesc.trim() ? produkDesc : undefined, body.language)
      : sourceImage.type === "skincare" ? buildSkincarePrompt(profile, produkDesc.trim() ? produkDesc : undefined, body.language)
      : sourceImage.type === "software" ? buildSoftwarePrompt(profile, sourceImage.size_hint ?? undefined, body.language)
      : sourceImage.type === "suasana" ? buildRuanganPrompt(profile, sourceImage.size_hint ?? undefined, body.language)
      : sourceImage.type === "wajah" ? buildOrangPrompt(profile, body.language)
      : buildScenePrompt(profile, sourceImage.size_hint ?? undefined, body.language, produkDesc)
    ) + headlineNote + temaImageNote + konsepImageNote;
    let result;
    if (body.referenceDataUri) {
      // Konten manual dengan referensi gaya: kirim foto produk + gambar referensi.
      const refMatch = body.referenceDataUri.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!refMatch) return fail("Gambar referensi tidak valid.", 400);
      result = await editImageWithReference({
        productBase64: imageBase64,
        productMime: mimeType,
        referenceBase64: refMatch[2],
        referenceMime: refMatch[1],
        aspectRatio: body.ratio,
        // PENTING: konsepImageNote SENGAJA TIDAK diikutkan di sini (beda dari
        // jalur non-referensi di atas) — permintaan user 12 Sep 2026: untuk
        // Referensi, gambar WAJIB tetap ikut komposisi/mood foto referensi +
        // produk asli, konsep tertulis HANYA boleh memengaruhi judul & caption
        // (sudah ditangani lewat konsepDecisionBlock di titles/caption).
        // konsepImageNote sebelumnya bisa suruh AI "abaikan produk, gambarkan
        // situasi lain" kalau konsepnya situasi berdiri sendiri — itu langsung
        // bentrok dengan tujuan inti fitur Referensi.
        prompt: buildReferencePrompt(profile, produkDesc.trim() ? produkDesc : undefined, body.language) + temaImageNote,
      });
    } else {
      result = await editImage({ imageBase64, mimeType, aspectRatio: body.ratio, prompt });
    }
    if (!result.ok) return fail(result.error, 502);
    imageDataUri = result.dataUri;
  } else {
    const scene = content.imageScene ?? "";
    const prompt =
      body.jenis === "general"
        ? buildGeneralImagePrompt(scene, body.language) + (body.tema ? themeImageNote(body.tema, body.language) : "")
        : buildInteraksiImagePrompt(scene, body.language);
    const result = await generateImage({ prompt, aspectRatio: body.ratio });
    if (!result.ok) return fail(result.error, 502);
    imageDataUri = result.dataUri;
  }

  // ── Simpan gambar BERSIH ke storage (untuk keperluan edit ulang nanti) ───
  const serviceClient = createServiceRoleClient();
  const bgPath = `${user.id}/bg/${randomUUID()}.png`;
  const bgBuffer = dataUriToBuffer(imageDataUri);
  const { error: bgUploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(bgPath, bgBuffer, { contentType: "image/png" });
  // Kalau gagal simpan bg, lanjut saja — tidak fatal; edit konten lama akan fallback ke imageUrl
  if (bgUploadError) {
    console.warn("Gagal simpan background bersih:", bgUploadError.message);
  }

  // ── Render gambar final (dengan overlay judul + logo + sosmed) ───────────
  const useArtDirector = body.jenis === "produk" && !isGabung && body.useArtDirector === true;
  const useTracing = useArtDirector && body.useTracing === true;
  const socials = buildFooterSocials(profile);

  let templateToRender: Template;
  let renderValues: Record<string, string>;
  let artDirectorItems: import("@/lib/editor/layoutOverrides").FreeItem[] | undefined;

  if (useArtDirector) {
    const mimeMatch = imageDataUri.match(/^data:(image\/\w+);base64,/);
    const photoMimeType = mimeMatch?.[1] || "image/png";
    const photoBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");

    const design = await runFullDesignPipeline({
      profile,
      productDescription: produkDesc,
      photoBase64,
      photoMimeType,
      ratio: body.ratio,
      lang: body.language === "en" ? "en" : "id",
      chosenHeadline: content.onImageText,
      callGeminiVision: callGeminiVisionForLayout,
    });

    if (!design.ok) {
      // Best-effort: gagal desain lengkap -> JANGAN gagalkan seluruh generate,
      // fallback ke jalur lama (foto biasa + judul overlay Satori) supaya user
      // tetap dapat hasil, bukan error kosong.
      console.error("[useArtDirector] fullDesignPipeline gagal, fallback ke template lama:", design.error);
      const baseTemplateFallback = body.jenis === "interaksi" ? interaksiTemplate : polosTemplate;
      const withFooterFallback = socials.length > 0
        ? withFooterOverride(baseTemplateFallback, profile.business.name, socials)
        : baseTemplateFallback;
      templateToRender = withLogoOverride(withFooterFallback, profile.logo);
      renderValues = { photo: imageDataUri, caption: content.onImageText };
    } else {
      // 1 token tambahan — desain lengkap = 1-2x panggilan Gemini image ekstra
      // (generate + retry kalau typo) + 1x vision validasi. Best-effort,
      // TIDAK menggagalkan hasil yang sudah jadi kalau potong token gagal.
      try {
        await consumeTokens(supabase, user.id, 1, user.email, "Full Design AI");
      } catch {
        // best-effort
      }
      if (!design.validationPassed) {
        console.warn("[useArtDirector] hasil dipakai TANPA lolos validasi ejaan (retry sudah habis)");
      }

      let finalTemplate = design.template;
      let finalValues = design.values;

      if (useTracing) {
        // EKSPERIMENTAL — lihat lib/ai/fullDesignTracing.ts untuk penjelasan
        // lengkap & batasannya. Best-effort total: gagal tracing TIDAK
        // menggagalkan apa pun, cuma jatuh balik ke gambar dgn teks terbakar.
        const tracing = await traceFullDesign({
          designDataUri: design.finalPhotoDataUri,
          ratio: body.ratio,
          lang: body.language === "en" ? "en" : "id",
          callGeminiVision: callGeminiVisionForLayout,
        });

        if (tracing.traced) {
          finalValues = { photo: tracing.cleanPhotoDataUri };
          artDirectorItems = tracing.items;
          // Token tambahan KEDUA — 1x hapus-teks (Gemini image) + 1x deteksi
          // (Gemini vision). Cuma dipotong kalau tracing BENAR-BENAR berhasil.
          try {
            await consumeTokens(supabase, user.id, 1, user.email, "Full Design Tracing");
          } catch {
            // best-effort
          }
        } else {
          console.warn("[useTracing] tracing gagal, hasil dipakai APA ADANYA (teks masih terbakar, tidak bisa diedit)");
        }
      }

      const withFooterAD = socials.length > 0
        ? withFooterOverride(finalTemplate, profile.business.name, socials)
        : finalTemplate;
      templateToRender = withLogoOverride(withFooterAD, profile.logo);
      renderValues = finalValues;
    }
  } else {
    const baseTemplate = body.jenis === "interaksi" ? interaksiTemplate : polosTemplate;
    const withFooter = socials.length > 0
      ? withFooterOverride(baseTemplate, profile.business.name, socials)
      : baseTemplate;
    templateToRender = withLogoOverride(withFooter, profile.logo);
    renderValues = { photo: imageDataUri, caption: content.onImageText };
  }

  let pngBuffer: Buffer;
  try {
    const { renderTemplate } = await import("@/lib/render/renderTemplate");
    pngBuffer = await renderTemplate({
      template: templateToRender,
      values: renderValues,
      ratio: body.ratio,
    });
 } catch (error) {
    await logError({
      businessId: user.id,
      route: "generate-auto",
      error,
      metadata: { step: "render_template", jenis: body.jenis, ratio: body.ratio, useArtDirector },
    });
    return fail(error instanceof Error ? error.message : "Gagal merender konten.", 500);
  }

  // ── Insert ke database (termasuk background_path) ────────────────────────
  const insertResult = await insertGeneratedContent(supabase, {
    jenis: body.jenis,
    sourceImageId: sourceImage?.id ?? null,
    pngBuffer,
    onImageText: content.onImageText,
    caption: content.caption,
    ratio: body.ratio,
    businessId: user.id,
    backgroundPath: bgUploadError ? undefined : bgPath,
  }, serviceClient);
  if (!insertResult.ok) return fail(insertResult.error, 502);

  const row = insertResult.row;
  const bgRow = row as typeof row & { background_path?: string | null };

  return NextResponse.json({
    item: {
      id: row.id,
      jenis: row.jenis,
      imageUrl: publicImageUrl(supabase, row.storage_path),
      backgroundUrl: bgRow.background_path
        ? publicImageUrl(serviceClient, bgRow.background_path)
        : undefined,
      backgroundDataUri: imageDataUri,
      onImageText: row.on_image_text,
      caption: row.caption,
      ratio: row.ratio,
      status: row.status,
      createdAt: row.created_at,
      fontId: fontOption?.id ?? null,
      jawaban: content.jawaban ?? null,
      // Editor DOM (client) SEBELUMNYA selalu membangun ulang template sendiri
      // dari polosTemplate/interaksiTemplate (lihat AutoGenerate.tsx) — kalau
      // Art Director dipakai, template ASLI yang dirender server (lengkap
      // dengan slot subjudul+badge) HARUS dikirim balik, atau editor akan
      // menampilkan versi tanpa badge (template lama) walau PNG hasil generate
      // sebenarnya sudah benar.
      usedArtDirector: useArtDirector,
      artDirectorTemplate: useArtDirector ? templateToRender : undefined,
      artDirectorValues: useArtDirector ? renderValues : undefined,
      artDirectorItems: artDirectorItems && artDirectorItems.length > 0 ? artDirectorItems : undefined,
    },
  });
}
