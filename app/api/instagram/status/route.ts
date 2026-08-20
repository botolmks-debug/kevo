// app/api/instagram/status/route.ts
// GET: status koneksi IG user (tanpa membocorkan token).
// DELETE: putuskan koneksi.
import { NextResponse } from "next/server";
import { getConnection, deleteConnection } from "@/lib/supabase/igConnections";
import { igFeatureAllowed } from "@/lib/instagram/access";
import { getRouteUser } from "@/lib/instagram/serverUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const allowed = igFeatureAllowed(user.email);
  if (!allowed) return NextResponse.json({ allowed: false, connected: false });

  const conn = await getConnection(user.id);
  return NextResponse.json({
    allowed: true,
    connected: !!conn,
    username: conn?.ig_username ?? null,
    pageName: conn?.page_name ?? null,
    expiresAt: conn?.token_expires_at ?? null,
  });
}

export async function DELETE() {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  await deleteConnection(user.id);
  return NextResponse.json({ ok: true });
}
