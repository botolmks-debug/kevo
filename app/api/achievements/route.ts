/**
 * GET /api/achievements
 * Hitung total hari aktif user (tabel activity_days), berikan hadiah token
 * untuk peringkat yang BARU tercapai (idempoten via RPC grant_achievement —
 * peringkat yang sudah tercatat tidak dihadiahi dua kali), lalu kembalikan
 * status lengkap untuk kartu achievement di Dashboard.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TIERS, currentTier, nextTier } from "@/lib/achievements/tiers";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  // Total hari aktif (bukan berturut-turut).
  const { count } = await supabase
    .from("activity_days")
    .select("day", { count: "exact", head: true })
    .eq("business_id", user.id);
  const activeDays = count ?? 0;

  // Peringkat yang sudah tercatat sebelumnya.
  const { data: rows } = await supabase
    .from("business_achievements")
    .select("tier")
    .eq("business_id", user.id);
  const recorded = new Set((rows ?? []).map((r) => (r as { tier: string }).tier));

  // Hadiahkan peringkat yang tercapai tapi belum tercatat.
  const newlyGranted: { tier: string; tokens: number }[] = [];
  for (const t of TIERS) {
    if (activeDays >= t.days && !recorded.has(t.id)) {
      const { data: inserted } = await supabase.rpc("grant_achievement", {
        p_business_id: user.id,
        p_tier: t.id,
        p_tokens: t.rewardTokens,
      });
      if (inserted === true) {
        recorded.add(t.id);
        if (t.rewardTokens > 0) newlyGranted.push({ tier: t.label, tokens: t.rewardTokens });
      }
    }
  }

  const tier = currentTier(activeDays);
  const next = nextTier(activeDays);

  return NextResponse.json({
    activeDays,
    tier: tier ? { id: tier.id, label: tier.label, color: tier.color } : null,
    next: next
      ? { id: next.id, label: next.label, days: next.days, sisa: next.days - activeDays, reward: next.rewardTokens }
      : null,
    tiers: TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      days: t.days,
      reward: t.rewardTokens,
      color: t.color,
      achieved: activeDays >= t.days,
    })),
    newlyGranted, // untuk pesan "Selamat! +N token" di UI
  });
}
