/**
 * POST /api/video/veo/storyboard — ADMIN ONLY.
 * OpenAI menyusun naskah + storyboard + prompt video terkunci realistis
 * dari produk + target market. Murah (teks saja), belum menyentuh Veo.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { buildStoryboard } from "@/lib/video/storyboard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    productDescription?: string;
    targetMarket?: string;
    businessName?: string;
    durationSeconds?: number;
  } | null;
  if (!body?.productDescription?.trim() || !body?.targetMarket?.trim()) {
    return NextResponse.json({ error: "Isi deskripsi produk dan target market." }, { status: 400 });
  }

  try {
    const sb = await buildStoryboard({
      productDescription: body.productDescription.trim(),
      targetMarket: body.targetMarket.trim(),
      businessName: body.businessName?.trim(),
      durationSeconds:
        body.durationSeconds === 4 || body.durationSeconds === 6 || body.durationSeconds === 10
          ? body.durationSeconds
          : 8,
    });
    return NextResponse.json(sb);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membuat storyboard." },
      { status: 500 },
    );
  }
}
