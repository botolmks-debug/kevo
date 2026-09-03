import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { consumeToken, refundToken } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { logError } from "@/lib/monitoring/errorLog";
import { searchIndustryNews } from "@/lib/ai/newsSearch";
import { buildNewsContentPrompt } from "@/lib/ai/newsPrompt";
import { buildNewsScenePrompt } from "@/lib/ai/scenePrompt";
import { generateImage } from "@/lib/ai/geminiImage";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { insertGeneratedContent } from "@/lib/supabase/generatedContent";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { withFooterOverride } from "@/app/generate/withFooterOverride";
import { withLogoOverride } from "@/app/generate/withLogoOverride";
import { polosTemplate } from "@/lib/templates/polos";
import { publicImageUrl } from "@/lib/supabase/images";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import type { AspectRatio } from "@/lib/templates/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Butuh waktu ekstra: 1x panggilan search berita + 1x generate teks + 1x
// generate gambar, berurutan (bukan paralel, karena teks butuh hasil
// pencarian dulu).
export const maxDuration = 300;

const VALID_RATIOS: AspectRatio[] = ["4:5", "1:1", "9:16"];
const BUCKET = "user-images";

/** Sama seperti generate-auto: 1 token per generate (1 gambar + 1 teks). */
export const NEWS_TOKEN_COST = 1;

type RequestBody = { ratio?: AspectRatio; language?: "id" | "en" };

function dataUriToBuffer(dataUri: string): Buffer {
  const base64 = dataUri.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
      { status: 500 },
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
    // body kosong juga valid (semua field opsional)
  }
  const ratio: AspectRatio = body.ratio && VALID_RATIOS.includes(body.ratio) ? body.ratio : "4:5";
  const language = body.language === "en" ? "en" : "id";

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return NextResponse.json({ error: profileResult.error }, { status: 502 });
  const profile = profileResult.profile;
  if (!profile) {
    return NextResponse.json(
      { error: "Lengkapi dulu profil bisnis (onboarding) sebelum pakai fitur Konten Berita." },
      { status: 400 },
    );
  }
  if (!profile.business.industry?.trim()) {
    return NextResponse.json(
      { error: "Isi dulu industri bisnis di onboarding sebelum pakai fitur Konten Berita." },
      { status: 400 },
    );
  }

  const token = await consumeToken(supabase, user.id, user.email, "Berita");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  async function fail(error: string, status: number) {
    await refundToken(supabase, user!.id, user!.email);
    await logError({ businessId: user!.id, route: "generate-news", error: new Error(error), metadata: { status } });
    return NextResponse.json({ error }, { status });
  }

  // ── 1) Cari berita relevan industri user (Gemini Google Search grounding) ─
  const news = await searchIndustryNews(profile.business.industry, profile.offering.mainProducts, language);
  if (!news.ok) return fail(news.error, 502);

  // ── 2) Judul + caption + deskripsi adegan (JSON) ─────────────────────────
  const contentPrompt = buildNewsContentPrompt(profile, news.summary, news.sourceName, language);
  const contentResult = await generateJsonContent(contentPrompt);
  if (!contentResult.ok) return fail(contentResult.error, 502);
  const content = contentResult.data as { onImageText?: string; caption?: string; imageScene?: string; fontId?: string };
  if (!content.onImageText || !content.caption) {
    return fail("AI mengembalikan format konten tidak lengkap. Coba lagi.", 502);
  }
  const fontOption = content.fontId ? FONT_OPTIONS.find((f) => f.id === content.fontId) : null;

  // ── 3) Gambar suasana berita (BUKAN foto orang asli dari berita) ─────────
  const imgResult = await generateImage({
    prompt: buildNewsScenePrompt(content.imageScene || news.summary, language),
    aspectRatio: ratio,
  });
  if (!imgResult.ok) return fail(imgResult.error, 502);
  const imageDataUri = imgResult.dataUri;

  // ── Simpan gambar bersih (untuk edit ulang nanti) ────────────────────────
  const serviceClient = createServiceRoleClient();
  const bgPath = `${user.id}/bg/${randomUUID()}.png`;
  const bgBuffer = dataUriToBuffer(imageDataUri);
  const { error: bgUploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(bgPath, bgBuffer, { contentType: "image/png" });
  if (bgUploadError) {
    console.warn("Gagal simpan background bersih:", bgUploadError.message);
  }

  // ── Render final (overlay judul + logo + sosmed) — pola sama generate-auto
  const socials = buildFooterSocials(profile);
  const withFooter = socials.length > 0
    ? withFooterOverride(polosTemplate, profile.business.name, socials)
    : polosTemplate;
  const templateToRender = withLogoOverride(withFooter, profile.logo);

  let pngBuffer: Buffer;
  try {
    const { renderTemplate } = await import("@/lib/render/renderTemplate");
    pngBuffer = await renderTemplate({
      template: templateToRender,
      values: { photo: imageDataUri, caption: content.onImageText },
      ratio,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal merender konten.", 500);
  }

  const insertResult = await insertGeneratedContent(supabase, {
    jenis: "berita",
    sourceImageId: null,
    pngBuffer,
    onImageText: content.onImageText,
    caption: content.caption,
    ratio,
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
      backgroundUrl: bgRow.background_path ? publicImageUrl(serviceClient, bgRow.background_path) : undefined,
      backgroundDataUri: imageDataUri,
      onImageText: row.on_image_text,
      caption: row.caption,
      ratio: row.ratio,
      status: row.status,
      createdAt: row.created_at,
      fontId: fontOption?.id ?? null,
      newsSource: news.sourceName,
    },
    tokensRemaining: token.remaining,
  });
}
