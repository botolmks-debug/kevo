// app/api/cron/instagram-refresh/route.ts
// Cron harian: perpanjang token yang akan kadaluarsa dalam < 10 hari.
import { NextResponse } from "next/server";
import { createIgServiceClient, updateToken } from "@/lib/supabase/igConnections";
import { refreshLongLivedToken } from "@/lib/instagram/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createIgServiceClient();
  const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();

  const { data: rows, error } = await db
    .from("ig_connections")
    .select("business_id,access_token,token_expires_at")
    .lte("token_expires_at", soon);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ id: string; ok: boolean }> = [];
  for (const row of rows ?? []) {
    try {
      const { accessToken, expiresAt } = await refreshLongLivedToken(row.access_token);
      await updateToken(row.business_id, accessToken, expiresAt);
      results.push({ id: row.business_id, ok: true });
    } catch {
      results.push({ id: row.business_id, ok: false });
    }
  }

  return NextResponse.json({ refreshed: results });
}
