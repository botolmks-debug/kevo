import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeToken } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages, publicImageUrl, type ImageRow } from "@/lib/supabase/images";
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
import { renderTemplate } from "@/lib/render/renderTemplate";
import { buildScenePrompt } from "@/lib/ai/scenePrompt";
import { editImage, generateImage } from "@/lib/ai/geminiImage";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import {
  buildGeneralContentPrompt,
  buildInteraksiContentPrompt,
  buildProdukContentPrompt,
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

type RequestBody = { jenis: GeneratedContentJenis; ratio: AspectRatio; imageId?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidBody(body: unknown): body is RequestBody {
  if (!isRecord(body)) return false;
  if (typeof body.jenis !== "string" || !VALID_JENIS.includes(body.jenis as GeneratedContentJenis)) return false;
  if (typeof body.ratio !== "string" || !VALID_RATIOS.includes(body.ratio as AspectRatio)) return false;
  if (body.imageId !== undefined && typeof body.imageId !== "string") return false;
  return true;
}

type AutoContent = { onImageText: string; caption: string; imageScene?: string; fontId?: string };

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
  if (body.jenis === "produk" && !body.imageId) {
    return NextResponse.json({ error: "Pilih gambar produk dulu." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const token = await consumeToken(supabase, user.id, user.email);
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return NextResponse.json({ error: profileResult.error }, { status: 502 });
  const profile = profileResult.profile;
  if (!profile) {
    return NextResponse.json({ error: "Lengkapi profil bisnis dulu di halaman onboarding." }, { status: 400 });
  }

  let sourceImage: ImageRow | null = null;
  if (body.jenis === "produk") {
    const imagesResult = await listImages(supabase, user.id);
    if (!imagesResult.ok) return NextResponse.json({ error: imagesResult.error }, { status: 502 });
    const image = imagesResult.images.find((img) => img.id === body.imageId) ?? null;
    if (!image || image.category !== "Produk" || image.usage !== "olah_ai") {
      return NextResponse.json(
        { error: "Gambar tidak ditemukan atau bukan gambar produk yang boleh diolah AI." },
        { status: 400 },
      );
    }
    sourceImage = image;
  }

  // ── Generate teks (headline + caption + fontId) ──────────────────────────
  const contentPrompt =
    body.jenis === "produk" ? buildProdukContentPrompt(profile, sourceImage?.description ?? "")
    : body.jenis === "general" ? buildGeneralContentPrompt(profile)
    : buildInteraksiContentPrompt(profile);

  const contentResult = await generateJsonContent(contentPrompt);
  if (!contentResult.ok) return NextResponse.json({ error: contentResult.error }, { status: 502 });

  const requireScene = body.jenis !== "produk";
  if (!isAutoContent(contentResult.data, requireScene)) {
    return NextResponse.json({ error: "AI mengembalikan format konten tidak lengkap. Coba lagi." }, { status: 502 });
  }
  const content = contentResult.data;
  const fontOption = content.fontId ? FONT_OPTIONS.find((f) => f.id === content.fontId) : null;

  // ── Generate gambar bersih (tanpa overlay) ───────────────────────────────
  let imageDataUri: string;
  if (body.jenis === "produk") {
    if (!sourceImage) return NextResponse.json({ error: "Pilih gambar produk dulu." }, { status: 400 });
    let imageBase64: string; let mimeType: string;
    try {
      const sourceRes = await fetch(publicImageUrl(supabase, sourceImage.storage_path));
      if (!sourceRes.ok) throw new Error(`status ${sourceRes.status}`);
      mimeType = sourceRes.headers.get("content-type") ?? "image/jpeg";
      imageBase64 = Buffer.from(await sourceRes.arrayBuffer()).toString("base64");
    } catch {
      return NextResponse.json({ error: "Gagal mengambil gambar produk." }, { status: 502 });
    }
    const result = await editImage({ imageBase64, mimeType, aspectRatio: body.ratio, prompt: buildScenePrompt(profile, sourceImage.size_hint ?? undefined) });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
    imageDataUri = result.dataUri;
  } else {
    const scene = content.imageScene ?? "";
    const prompt = body.jenis === "general" ? buildGeneralImagePrompt(scene) : buildInteraksiImagePrompt(scene);
    const result = await generateImage({ prompt, aspectRatio: body.ratio });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
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
    pngBuffer = await renderTemplate({
      template: templateToRender,
      values: { photo: imageDataUri, caption: content.onImageText },
      ratio: body.ratio,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal merender konten." },
      { status: 500 },
    );
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
  });
  if (!insertResult.ok) return NextResponse.json({ error: insertResult.error }, { status: 502 });

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
    },
  });
}
