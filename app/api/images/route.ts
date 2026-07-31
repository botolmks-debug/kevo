import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listImages, publicImageUrl, uploadImage } from "@/lib/supabase/images";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { IMAGE_CATEGORIES, type ImageUsage } from "@/lib/images/categories";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set(IMAGE_CATEGORIES.map((c) => c.category));
const VALID_USAGE = new Set<ImageUsage>(["apa_adanya", "olah_ai"]);

function envErrorResponse() {
  return NextResponse.json(
    { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
    { status: 503 },
  );
}

export async function GET() {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return envErrorResponse();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const result = await listImages(supabase, user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const images = result.images.map((image) => ({
    ...image,
    publicUrl: publicImageUrl(supabase, image.storage_path),
  }));

  return NextResponse.json({ images });
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return envErrorResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "body harus berupa multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const description = formData.get("description");
  const category = formData.get("category");
  const usage = formData.get("usage") ?? "apa_adanya";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File gambar wajib diisi." }, { status: 400 });
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Kategori tidak valid." }, { status: 400 });
  }
  if (typeof usage !== "string" || !VALID_USAGE.has(usage as ImageUsage)) {
    return NextResponse.json({ error: "Perlakuan gambar tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const result = await uploadImage(supabase, {
    file,
    description: typeof description === "string" ? description : "",
    category,
    usage: usage as ImageUsage,
    businessId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    image: { ...result.image, publicUrl: publicImageUrl(supabase, result.image.storage_path) },
  });
}