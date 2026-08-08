import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daftar email admin — hanya email di sini yang bisa akses
const ADMIN_EMAILS = new Set([
  "botolmks@gmail.com",
]);

export async function GET() {
  // Cek user login
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  // Cek admin
  if (!user.email || !ADMIN_EMAILS.has(user.email)) {
    return NextResponse.json({ error: "Bukan admin." }, { status: 403 });
  }

  const service = createServiceRoleClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Error 24 jam terakhir ─────────────────────────────────────────
  const { count: errorCount24h } = await service
    .from("error_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgo);

  const { data: recentErrors } = await service
    .from("error_logs")
    .select("id, route, provider, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // ── 2. Generate 24 jam ───────────────────────────────────────────────
  const { count: generateCount24h } = await service
    .from("generated_content")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgo);

  // Breakdown per jenis
  const { data: generateByJenis } = await service
    .from("generated_content")
    .select("jenis")
    .gte("created_at", dayAgo);

  const jenisBreakdown: Record<string, number> = { produk: 0, general: 0, interaksi: 0 };
  (generateByJenis ?? []).forEach((row) => {
    const j = row.jenis as string;
    if (j in jenisBreakdown) jenisBreakdown[j]++;
  });

  // ── 3. User stats ────────────────────────────────────────────────────
  const { data: activeUsers24h } = await service
    .from("generated_content")
    .select("business_id")
    .gte("created_at", dayAgo);

  const uniqueActive = new Set((activeUsers24h ?? []).map((r) => r.business_id));

  const { count: newUsers7d } = await service
    .schema("auth")
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const { count: totalUsers } = await service
    .schema("auth")
    .from("users")
    .select("*", { count: "exact", head: true });

  // ── 4. Token usage 24 jam ────────────────────────────────────────────
  const { count: tokenUsage24h } = await service
    .from("token_usage")
    .select("*", { count: "exact", head: true })
    .gte("created_at", dayAgo);

  return NextResponse.json({
    timestamp: now.toISOString(),
    errors: {
      count24h: errorCount24h ?? 0,
      recent: recentErrors ?? [],
    },
    generate: {
      count24h: generateCount24h ?? 0,
      byJenis: jenisBreakdown,
    },
    users: {
      active24h: uniqueActive.size,
      new7d: newUsers7d ?? 0,
      total: totalUsers ?? 0,
    },
    tokens: {
      usage24h: tokenUsage24h ?? 0,
    },
  });
}