import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isAdmin, isUnlimited } from "@/lib/supabase/tokens";

export const runtime = "nodejs";

type UsageEntry = { action: string | null; at: string };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Halaman khusus admin." }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di server." }, { status: 503 });
  }

  const admin = createServiceRoleClient();

  // Daftar user (email + waktu login) — butuh service role.
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (authError) {
    return NextResponse.json({ error: "Gagal memuat data user." }, { status: 502 });
  }
  const authUsers = authData?.users ?? [];

  // Profil (nama bisnis + sisa token).
  const { data: profiles } = await admin
    .from("business_profile")
    .select("business_id, business_name, tokens");
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.business_id as string, p as { business_name?: string; tokens?: number }]),
  );

  // Riwayat pemakaian token (terbaru). Diabaikan kalau tabel belum ada.
  let usage: { business_id: string; action: string | null; created_at: string }[] = [];
  const { data: usageData } = await admin
    .from("token_usage")
    .select("business_id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (usageData) usage = usageData as typeof usage;

  const usageByBiz = new Map<string, UsageEntry[]>();
  for (const u of usage) {
    const arr = usageByBiz.get(u.business_id) ?? [];
    arr.push({ action: u.action, at: u.created_at });
    usageByBiz.set(u.business_id, arr);
  }

  const rows = authUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const usageArr = usageByBiz.get(u.id) ?? [];
    const unlimited = isUnlimited(u.email);
    return {
      email: u.email ?? "-",
      lastSignInAt: u.last_sign_in_at ?? null,
      createdAt: u.created_at ?? null,
      businessName: profile?.business_name ?? null,
      unlimited,
      tokens: unlimited ? null : (typeof profile?.tokens === "number" ? profile.tokens : null),
      usageCount: usageArr.length,
      lastUsedAt: usageArr[0]?.at ?? null,
      recentUsage: usageArr.slice(0, 10),
    };
  });

  // Urutkan: yang paling baru login di atas.
  rows.sort((a, b) => (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? ""));

  return NextResponse.json({ rows });
}
