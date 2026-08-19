import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeToken, refundToken, isAdmin } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages, publicImageUrl, type ImageRow } from "@/lib/supabase/images";
import { logError } from "@/lib/monitoring/errorLog";
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
import {
  buildGeneralContentPrompt,
  buildInteraksiContentPrompt,
  buildProdukContentPrompt,
  buildGabungContentPrompt,
  hookInstruction,
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

type RequestBody = { jenis: GeneratedContentJenis; ratio: AspectRatio; imageId?: string; imageIds?: string[]; language?: "id" | "en"; referenceDataUri?: string; hook?: boolean };

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
  if (body.hook !== undefined && typeof body.hook !== "boolean") return false;
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

  // ── Generate teks (headline + caption + fontId) ──────────────────────────
  // Tombol 🔥 (hook): kalau ON, suntik instruksi WTF-hook lewat param `extra`.
  // HANYA utk produk/gabung/general — Interaksi punya format sendiri (kuis/
  // quote/tips) dan tidak ikut. Carousel punya alur generate terpisah.
  const hookExtra = body.hook ? hookInstruction(body.language) : undefined;
  const contentPrompt = (
    isGabung ? buildGabungContentPrompt(profile, sourceImages.map((s) => s.description ?? ""), body.language, hookExtra)
    : body.jenis === "produk" ? buildProdukContentPrompt(profile, sourceImage?.description ?? "", body.language, hookExtra)
    : body.jenis === "general" ? buildGeneralContentPrompt(profile, body.language, hookExtra)
    : buildInteraksiContentPrompt(profile, body.language)
  ) + notesBlock;

  const contentResult = await generateJsonContent(contentPrompt);
  if (!contentResult.ok) return fail(contentResult.error, 502);

  const requireScene = body.jenis !== "produk";
  if (!isAutoContent(contentResult.data, requireScene)) {
    return fail("AI mengembalikan format konten tidak lengkap. Coba lagi.", 502);
  }
  const content = contentResult.data;
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
    try {
      const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(sourceImage.storage_path);
      if (error || !data) throw new Error(error?.message ?? "download gagal");
      mimeType = (data as Blob).type || "image/jpeg";
      imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    } catch {
      return fail("Gagal mengambil gambar produk.", 502);
    }
    const prompt =
      sourceImage.type === "makanan" ? buildFoodPrompt(profile, sourceImage.description ?? undefined, body.language)
      : sourceImage.type === "skincare" ? buildSkincarePrompt(profile, sourceImage.description ?? undefined, body.language)
      : sourceImage.type === "software" ? buildSoftwarePrompt(profile, sourceImage.size_hint ?? undefined, body.language)
      : sourceImage.type === "suasana" ? buildRuanganPrompt(profile, sourceImage.size_hint ?? undefined, body.language)
      : sourceImage.type === "wajah" ? buildOrangPrompt(profile, body.language)
      : buildScenePrompt(profile, sourceImage.size_hint ?? undefined, body.language);
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
        prompt: buildReferencePrompt(profile, sourceImage.description ?? undefined, body.language),
      });
    } else {
      result = await editImage({ imageBase64, mimeType, aspectRatio: body.ratio, prompt });
    }
    if (!result.ok) return fail(result.error, 502);
    imageDataUri = result.dataUri;
  } else {
    const scene = content.imageScene ?? "";
    const prompt = body.jenis === "general" ? buildGeneralImagePrompt(scene, body.language) : buildInteraksiImagePrompt(scene, body.language);
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
  const baseTemplate = body.jenis === "interaksi" ? interaksiTemplate : polosTemplate;
  const socials = buildFooterSocials(profile);
  const withFooter = socials.length > 0
    ? withFooterOverride(baseTemplate, profile.business.name, socials)
    : baseTemplate;
  const templateToRender = withLogoOverride(withFooter, profile.logo);

  let pngBuffer: Buffer;
  try {
    const { renderTemplate } = await import("@/lib/render/renderTemplate");
    pngBuffer = await renderTemplate({
      template: templateToRender,
      values: { photo: imageDataUri, caption: content.onImageText },
      ratio: body.ratio,
    });
 } catch (error) {
    await logError({
      businessId: user.id,
      route: "generate-auto",
      error,
      metadata: { step: "render_template", jenis: body.jenis, ratio: body.ratio },
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
    },
  });
}
