/**
 * POST /api/generate-logo
 * Generate 3 opsi PREVIEW logo sekaligus (Tipografi / Ikonik / Bebas AI) dari
 * data onboarding — TIDAK langsung disimpan. User pilih salah satu lalu approve
 * via POST /api/generate-logo/apply. Biaya tetap 1 token untuk 1x klik generate,
 * walau menghasilkan 3 opsi sekaligus (3 pemanggilan AI paralel).
 *
 * Versi terang setiap opsi dibuat DARI alpha channel versi gelapnya sendiri
 * (bukan generate AI terpisah) — jadi kedua varian PASTI identik bentuknya,
 * cuma beda warna (berwarna vs siluet putih).
 *
 * Hapus background: coba chroma-key magenta dulu (removeChromaBackground), AI
 * kadang tidak benar-benar pakai latar magenta solid walau diminta — kalau
 * hasilnya masih penuh opak, fallback ke removeSolidBackground (auto-deteksi
 * warna dari tepi gambar). Kalau opsi tsb tetap gagal, opsi itu di-skip
 * (bukan dikirim sebagai hasil rusak); token hanya dipotong kalau MINIMAL
 * 1 dari 3 opsi berhasil.
 */
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/ai/geminiImage";
import { removeChromaBackground, removeSolidBackground } from "@/lib/images/backgroundRemoval";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { getTokenState, consumeToken } from "@/lib/supabase/tokens";
import { buildLogoPrompt, LOGO_STYLES, type LogoStyle } from "@/lib/ai/logoPrompt";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export const runtime = "nodejs";
export const maxDuration = 180;

type LogoOption = { style: LogoStyle; label: string; logoDataUri: string; logoLightDataUri: string };

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

  const { data: freeRow } = await supabase
    .from("business_profile")
    .select("logo_free_generate_used")
    .eq("business_id", businessId)
    .maybeSingle();
  const isFreeGenerate = !(freeRow as { logo_free_generate_used?: boolean } | null)
    ?.logo_free_generate_used;

  // Cek jatah token DULU (belum dipotong) — biar percobaan yang akhirnya
  // gagal total (semua 3 opsi gagal) tidak pernah memakan token.
  if (!isFreeGenerate) {
    const tokenState = await getTokenState(supabase, businessId, user.email);
    if (!tokenState.unlimited && (tokenState.tokens ?? 0) <= 0) {
      return NextResponse.json({ error: "Token AI habis" }, { status: 402 });
    }
  }

  const settled = await Promise.allSettled(
    LOGO_STYLES.map((s) => generateOneOption(profile, s.key, s.label)),
  );

  const options: LogoOption[] = [];
  const errors: string[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") options.push(result.value);
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  }

  if (options.length === 0) {
    console.error("generate-logo: semua opsi gagal:", errors);
    return NextResponse.json(
      { error: "Gagal generate logo (semua opsi gagal). Coba lagi." },
      { status: 502 },
    );
  }

  // Baru sekarang charge — minimal 1 opsi sudah tervalidasi bisa dipakai.
  if (!isFreeGenerate) {
    const consumeResult = await consumeToken(supabase, businessId, user.email, "generate-logo");
    if (!consumeResult.ok) {
      return NextResponse.json({ error: consumeResult.error }, { status: 402 });
    }
  } else {
    await supabase
      .from("business_profile")
      .update({ logo_free_generate_used: true })
      .eq("business_id", businessId);
  }

  return NextResponse.json({ options, wasFree: isFreeGenerate });
}

async function generateOneOption(
  profile: BusinessProfile,
  style: LogoStyle,
  label: string,
): Promise<LogoOption> {
  const prompt = buildLogoPrompt(profile, style);
  const genResult = await generateImage({ prompt, aspectRatio: "1:1" });
  if (!genResult.ok) throw new Error(`[${label}] ${genResult.error}`);

  const match = /^data:(.+);base64,(.*)$/.exec(genResult.dataUri);
  if (!match) throw new Error(`[${label}] Gagal membaca hasil gambar AI.`);
  const rawBuffer = Buffer.from(match[2], "base64");

  const darkPng = await removeLogoBackground(rawBuffer, label);
  const lightPng = await toWhiteSilhouette(darkPng);

  return {
    style,
    label,
    logoDataUri: `data:image/png;base64,${darkPng.toString("base64")}`,
    logoLightDataUri: `data:image/png;base64,${lightPng.toString("base64")}`,
  };
}

/** Alpha channel nyaris 100% opak & seragam = background TIDAK berhasil dihapus. */
async function alphaLooksEmpty(buf: Buffer): Promise<boolean> {
  const { channels } = await sharp(buf).ensureAlpha().stats();
  const alpha = channels[channels.length - 1];
  return alpha.mean > 250 && alpha.stdev < 3;
}

async function removeLogoBackground(raw: Buffer, label: string): Promise<Buffer> {
  const viaChroma = await removeChromaBackground(raw);
  if (!(await alphaLooksEmpty(viaChroma))) return viaChroma;

  console.warn(`generate-logo [${label}]: chroma-key gagal, coba removeSolidBackground`);
  const viaSolid = await removeSolidBackground(raw);
  if (!(await alphaLooksEmpty(viaSolid))) return viaSolid;

  throw new Error(`[${label}] AI tidak menghasilkan latar yang bisa dihapus otomatis.`);
}

/**
 * Versi "terang" dibuat DARI alpha channel logo gelap (bukan generate AI
 * kedua) — semua piksel non-transparan diganti putih solid, jadi bentuk
 * PERSIS identik dengan versi gelap.
 *
 * PENTING: kanvas dasar dibuat channels:3 (RGB, TANPA alpha) sebelum
 * joinChannel(alpha). Kalau kanvas dasarnya sudah RGBA lalu di-joinChannel
 * lagi, hasilnya 5 channel dan alpha aslinya "tertimpa" alpha solid kanvas —
 * itu bug sebelumnya yang bikin versi terang selalu jadi kotak putih penuh.
 */
async function toWhiteSilhouette(pngBuffer: Buffer): Promise<Buffer> {
  const img = sharp(pngBuffer).ensureAlpha();
  const { width, height } = await img.metadata();
  const alpha = await img.clone().extractChannel("alpha").toBuffer();

  const whiteRgb = await sharp({
    create: {
      width: width!,
      height: height!,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  return sharp(whiteRgb).joinChannel(alpha).png().toBuffer();
}
