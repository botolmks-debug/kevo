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

  // ── 5. Kapasitas Supabase (free tier) ────────────────────────────────
  // Storage: jumlahkan ukuran semua file di storage.objects (service role bisa baca).
  // DB: fungsi RPC db_size_bytes() — lihat migration SQL di BACA-DULU.
  // Egress tidak bisa di-query — cek manual di Supabase dashboard > Usage.
  const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB free tier
  const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB free tier
  let storageBytes: number | null = null;
  try {
    // PostgREST default maks 1000 baris per permintaan — paginasi supaya
    // jumlah tetap benar saat file sudah ribuan (maks 20rb file dihitung).
    let total = 0;
    const PAGE = 1000;
    for (let page = 0; page < 20; page++) {
      const { data: objRows } = await service
        .schema("storage")
        .from("objects")
        .select("metadata")
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (!objRows || objRows.length === 0) break;
      for (const r of objRows) {
        const size = Number((r.metadata as { size?: number | string } | null)?.size ?? 0);
        if (Number.isFinite(size)) total += size;
      }
      if (objRows.length < PAGE) break;
    }
    storageBytes = total;
  } catch { /* biarkan null — UI tampilkan "tidak tersedia" */ }
  let dbBytes: number | null = null;
  try {
    const { data: sizeData } = await service.rpc("db_size_bytes");
    if (typeof sizeData === "number") dbBytes = sizeData;
    else if (typeof sizeData === "string") dbBytes = Number(sizeData);
  } catch { /* fungsi belum dibuat — UI tampilkan "tidak tersedia" */ }

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
    capacity: {
      storageBytes,
      storageLimitBytes: STORAGE_LIMIT_BYTES,
      dbBytes,
      dbLimitBytes: DB_LIMIT_BYTES,
    },
  });
}