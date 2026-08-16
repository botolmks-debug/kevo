import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Samakan dengan lib/supabase/tokens.ts UNLIMITED_EMAILS
const UNLIMITED_EMAILS = new Set(["botolmks@gmail.com"]);

const FREE_TOKENS_CAP = 5;
const REFILL_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Cek & lakukan refill kalau eligible. Dipanggil dari TokenSlot on-mount.
 * Response: state token terbaru + apakah baru saja dapat refill.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const isUnlimited = user.email ? UNLIMITED_EMAILS.has(user.email) : false;

  if (isUnlimited) {
    return NextResponse.json({
      unlimited: true,
      tokens: null,
      freeTokensCap: FREE_TOKENS_CAP,
      refilledJustNow: 0,
      nextRefillAt: null,
    });
  }

  const service = createServiceRoleClient();

  const { data: profile } = await service
    .from("business_profile")
    .select("tokens, last_free_refill_at")
    .eq("business_id", user.id)
    .maybeSingle();

  // Kalau belum ada profile (belum onboarding), balikkan state kosong
  if (!profile) {
    return NextResponse.json({
      unlimited: false,
      tokens: 0,
      freeTokensCap: FREE_TOKENS_CAP,
      refilledJustNow: 0,
      nextRefillAt: null,
    });
  }

  const currentTokens = (profile.tokens as number | null) ?? 0;
  const lastRefill = profile.last_free_refill_at
    ? new Date(profile.last_free_refill_at as string)
    : null;

  const now = new Date();

  // Sudah di/di atas cap → tidak perlu refill
  if (currentTokens >= FREE_TOKENS_CAP) {
    return NextResponse.json({
      unlimited: false,
      tokens: currentTokens,
      freeTokensCap: FREE_TOKENS_CAP,
      refilledJustNow: 0,
      nextRefillAt: null,
    });
  }

  // Cek apakah eligible refill
  const hoursSinceRefill = lastRefill
    ? (now.getTime() - lastRefill.getTime()) / HOUR_MS
    : Infinity;

  if (hoursSinceRefill < REFILL_HOURS) {
    // Belum eligible — kasih tahu next refill kapan
    const nextRefillAt = new Date(
      (lastRefill?.getTime() ?? now.getTime()) + REFILL_HOURS * HOUR_MS,
    );
    return NextResponse.json({
      unlimited: false,
      tokens: currentTokens,
      freeTokensCap: FREE_TOKENS_CAP,
      refilledJustNow: 0,
      nextRefillAt: nextRefillAt.toISOString(),
    });
  }

  // Eligible! Lakukan refill (+1, cap 5)
  const newTokens = Math.min(currentTokens + 1, FREE_TOKENS_CAP);
  const actualRefilled = newTokens - currentTokens;

  const { error: updateError } = await service
    .from("business_profile")
    .update({
      tokens: newTokens,
      last_free_refill_at: now.toISOString(),
    })
    .eq("business_id", user.id);

  if (updateError) {
    // Kalau gagal update, balikkan state saat ini (fail silent)
    return NextResponse.json({
      unlimited: false,
      tokens: currentTokens,
      freeTokensCap: FREE_TOKENS_CAP,
      refilledJustNow: 0,
      nextRefillAt: null,
    });
  }

  const nextRefillAt =
    newTokens < FREE_TOKENS_CAP
      ? new Date(now.getTime() + REFILL_HOURS * HOUR_MS)
      : null;
  return NextResponse.json({
    unlimited: false,
    tokens: newTokens,
    freeTokensCap: FREE_TOKENS_CAP,
    refilledJustNow: actualRefilled,
    nextRefillAt: nextRefillAt ? nextRefillAt.toISOString() : null,
  });
}
