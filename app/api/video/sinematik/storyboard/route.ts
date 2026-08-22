// POST /api/video/sinematik/storyboard
// body: { imageIds: string[] (1-3), produkNama?: string, produkDeskripsi?: string }
import { NextResponse } from "next/server";
import { buildSinematikStoryboard } from "@/lib/video/sinematik";
import {
  getRouteUser,
  isSinematikAdmin,
  loadBahan,
  publicImageUrl,
} from "@/lib/video/sinematikServer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const body = await req.json();
    const imageIds: string[] = (body.imageIds || []).slice(0, 3);
    if (imageIds.length < 1)
      return NextResponse.json({ error: "Pilih minimal 1 foto produk" }, { status: 400 });

    const { profil, images } = await loadBahan(supabase, user.id, imageIds);
    if (images.length < 1)
      return NextResponse.json({ error: "Foto produk tidak ditemukan" }, { status: 404 });

    const first = images[0];
    const produkNama =
      (body.produkNama || "").trim() ||
      first.title ||
      first.name ||
      first.label ||
      "produk unggulan";

    const sb = await buildSinematikStoryboard({
      profil: {
        businessName: profil.business_name || profil.name,
        businessType: profil.business_type || profil.category,
        targetMarket: profil.target_market,
        tone: profil.tone || profil.language_style,
        location: profil.location || profil.city,
      },
      produkNama,
      produkDeskripsi: (body.produkDeskripsi || "").trim() || undefined,
      sizeHint: first.size_hint || null,
    });

    const productImageUrls = images.map((im: any) => publicImageUrl(im.storage_path));

    return NextResponse.json({ storyboard: sb, productImageUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal membuat storyboard" }, { status: 500 });
  }
}
