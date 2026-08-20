// app/api/instagram/publish/route.ts
// POST { contentId }: posting konten ke Instagram SEKARANG (manual).
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/supabase/igConnections";
import { publishContentToIg } from "@/lib/instagram/publishContent";
import { igFeatureAllowed } from "@/lib/instagram/access";
import { getRouteUser } from "@/lib/instagram/serverUser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (!igFeatureAllowed(user.email)) {
    return NextResponse.json({ error: "Fitur Instagram belum dibuka" }, { status: 403 });
  }

  const conn = await getConnection(user.id);
  if (!conn) {
    return NextResponse.json(
      { error: "Instagram belum terhubung. Hubungkan dulu di Dashboard." },
      { status: 400 }
    );
  }

  let contentId = "";
  try {
    const body = await req.json();
    contentId = String(body?.contentId || "");
  } catch {
    /* noop */
  }
  if (!contentId) {
    return NextResponse.json({ error: "contentId wajib" }, { status: 400 });
  }

  try {
    const result = await publishContentToIg(contentId, conn);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal publish";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
