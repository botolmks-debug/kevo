import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeToken, isAdmin } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages, publicImageUrl } from "@/lib/supabase/images";
import { editImage } from "@/lib/ai/geminiImage";
import { buildHoldingProductPrompt } from "@/lib/ai/holdingProductPrompt";

export const runtime = "nodejs";
export const maxDuration = 300;

// Produk yang masuk akal untuk "dipegang".
const HOLDABLE = ["Produk", "Makanan/Minuman", "Kecantikan/Skincare"];

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase belum terhubung." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const imageId = typeof b.imageId === "string" ? b.imageId : "";
  const gender: "pria" | "wanita" = b.gender === "pria" ? "pria" : "wanita";
  if (!imageId) return NextResponse.json({ error: "Pilih produk dulu." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const token = await consumeToken(supabase, user.id, user.email, "VideoUjiPegang");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return NextResponse.json({ error: profileResult.error }, { status: 502 });
  const profile = profileResult.profile;
  if (!profile) {
    return NextResponse.json({ error: "Lengkapi profil bisnis dulu di halaman onboarding." }, { status: 400 });
  }

  const imagesResult = await listImages(supabase, user.id);
  if (!imagesResult.ok) return NextResponse.json({ error: imagesResult.error }, { status: 502 });
  const image = imagesResult.images.find((img) => img.id === imageId) ?? null;
  if (!image || !HOLDABLE.includes(image.category)) {
    return NextResponse.json(
      { error: "Produk tidak ditemukan atau kategorinya tidak bisa dipegang (pilih Produk / Makanan-Minuman / Skincare)." },
      { status: 400 },
    );
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const res = await fetch(publicImageUrl(supabase, image.storage_path));
    if (!res.ok) throw new Error(String(res.status));
    mimeType = res.headers.get("content-type") ?? "image/jpeg";
    imageBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json({ error: "Gagal mengambil gambar produk." }, { status: 502 });
  }

  const prompt = buildHoldingProductPrompt(profile, gender, image.description ?? undefined);
  const result = await editImage({ imageBase64, mimeType, aspectRatio: "9:16", prompt });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ imageUrl: result.dataUri, gender });
}
