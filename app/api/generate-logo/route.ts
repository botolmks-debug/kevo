/**
 * POST /api/generate-logo
 * Generate logo bisnis dari data onboarding (business_profile) via AI,
 * hapus latar magenta -> PNG transparan, buat versi terang (siluet putih)
 * dari alpha channel yang sama, lalu simpan KEDUA varian via lib/supabase/logo.ts
 * (reuse uploadLogo, jadi otomatis mengikuti aturan hapus-file-lama yang sudah ada).
 * Generate pertama gratis (kolom logo_free_generate_used), selanjutnya potong 1 token.
 */
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/geminiImage";
import { removeChromaBackground } from "@/lib/images/backgroundRemoval";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { uploadLogo } from "@/lib/supabase/logo";
import { consumeToken, refundToken } from "@/lib/supabase/tokens";
import { buildLogoPrompt } from "@/lib/ai/logoPrompt";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const businessId = user.id;

  const profileResult = await loadBusinessProfile(supabase, businessId);
  if (!profileResult.ok) {
    return NextResponse.json({ error: profileResult.error }, { status: 502 });
  }
  if (!profileResult.profile) {
    return NextResponse.json(
      { error: "Profil bisnis belum lengkap, selesaikan onboarding dulu." },
      { status: 400 },
    );
  }
  const profile = profileResult.profile;

  // Cek generate gratis pertama. Kolom terpisah (bukan lewat BusinessProfile
  // type) supaya tidak menyentuh onboarding/lib/onboarding/businessProfile.ts.
  const { data: freeRow } = await supabase
    .from("business_profile")
    .select("logo_free_generate_used")
    .eq("business_id", businessId)
    .maybeSingle();
  const isFreeGenerate = !(freeRow as { logo_free_generate_used?: boolean } | null)
    ?.logo_free_generate_used;

  // Potong token DULU (kecuali gratis pertama / unlimited — consumeToken yang
  // urus unlimited). Kalau ada langkah setelah ini gagal, refundToken dipanggil.
  if (!isFreeGenerate) {
    const consumeResult = await consumeToken(supabase, businessId, user.email, "generate-logo");
    if (!consumeResult.ok) {
      return NextResponse.json({ error: consumeResult.error }, { status: 402 });
    }
  }

  const prompt = buildLogoPrompt(profile);
  const genResult = await generateImage({ prompt, aspectRatio: "1:1" });
  if (!genResult.ok) {
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: genResult.error }, { status: 502 });
  }

  const match = /^data:(.+);base64,(.*)$/.exec(genResult.dataUri);
  if (!match) {
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: "Gagal membaca hasil gambar AI." }, { status: 502 });
  }
  const rawBuffer = Buffer.from(match[2], "base64");

  let darkPng: Buffer;
  try {
    darkPng = await removeChromaBackground(rawBuffer);
  } catch (error) {
    console.error("generate-logo: removeChromaBackground failed", error);
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: "Gagal memproses logo. Coba lagi." }, { status: 500 });
  }

  let lightPng: Buffer;
  try {
    lightPng = await toWhiteSilhouette(darkPng);
  } catch (error) {
    console.error("generate-logo: toWhiteSilhouette failed", error);
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: "Gagal memproses versi terang logo. Coba lagi." }, { status: 500 });
  }

  const darkFile = new File([new Uint8Array(darkPng)], "logo.png", { type: "image/png" });
  const lightFile = new File([new Uint8Array(lightPng)], "logo-light.png", { type: "image/png" });

  const darkUpload = await uploadLogo(supabase, { file: darkFile, businessId, variant: "dark" });
  if (!darkUpload.ok) {
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: darkUpload.error }, { status: 500 });
  }

  const lightUpload = await uploadLogo(supabase, { file: lightFile, businessId, variant: "light" });
  if (!lightUpload.ok) {
    if (!isFreeGenerate) await refundToken(supabase, businessId, user.email);
    return NextResponse.json({ error: lightUpload.error }, { status: 500 });
  }

  if (isFreeGenerate) {
    await supabase
      .from("business_profile")
      .update({ logo_free_generate_used: true })
      .eq("business_id", businessId);
  }

  return NextResponse.json({
    logoUrl: darkUpload.url,
    logoLightUrl: lightUpload.url,
    wasFree: isFreeGenerate,
  });
}

// Versi "terang" dibuat DARI alpha channel logo gelap (bukan generate AI
// kedua) — semua piksel non-transparan diganti putih solid. Bentuk identik,
// lebih murah, tidak butuh AI generate 2x.
async function toWhiteSilhouette(pngBuffer: Buffer): Promise<Buffer> {
  const img = sharp(pngBuffer).ensureAlpha();
  const { width, height } = await img.metadata();
  const alpha = await img.clone().extractChannel("alpha").toBuffer();

  const white = await sharp({
    create: {
      width: width!,
      height: height!,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp(white).joinChannel(alpha).png().toBuffer();
}
