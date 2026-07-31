import type { SupabaseClient } from "@supabase/supabase-js";

/** Email yang mendapat token TAK TERBATAS (tidak pernah dipotong). */
const UNLIMITED_EMAILS = new Set(["botolmks@gmail.com"]);
/** Jatah token default untuk user baru. */
export const DEFAULT_TOKENS = 10;

export function isUnlimited(email?: string | null): boolean {
  return !!email && UNLIMITED_EMAILS.has(email.trim().toLowerCase());
}

export type TokenState = { unlimited: boolean; tokens: number | null };

/** Baca sisa token (untuk ditampilkan). unlimited → tokens null. */
export async function getTokenState(
  client: SupabaseClient,
  businessId: string,
  email?: string | null,
): Promise<TokenState> {
  if (isUnlimited(email)) return { unlimited: true, tokens: null };
  const { data } = await client
    .from("business_profile")
    .select("tokens")
    .eq("business_id", businessId)
    .maybeSingle();
  const tokens = (data as { tokens?: number } | null)?.tokens;
  return { unlimited: false, tokens: typeof tokens === "number" ? tokens : DEFAULT_TOKENS };
}

export type ConsumeResult =
  | { ok: true; unlimited: boolean; remaining: number | null }
  | { ok: false; error: string };

/**
 * Potong 1 token untuk satu aksi AI. Unlimited → tidak dipotong. Kalau token
 * habis → { ok:false }. Pemotongan dilakukan atomik lewat RPC consume_token
 * (update ... where tokens > 0 returning tokens) supaya tidak balapan.
 */
export async function consumeToken(
  client: SupabaseClient,
  businessId: string,
  email?: string | null,
): Promise<ConsumeResult> {
  if (isUnlimited(email)) return { ok: true, unlimited: true, remaining: null };

  const { data, error } = await client.rpc("consume_token", { p_business_id: businessId });
  if (error) {
    console.error(`consumeToken rpc failed: ${error.message}`);
    return { ok: false, error: "Gagal memproses token. Coba lagi." };
  }
  const remaining = typeof data === "number" ? data : -1;
  if (remaining < 0) {
    return { ok: false, error: "Token AI habis. Fitur AI tidak bisa dipakai sampai token diisi ulang." };
  }
  return { ok: true, unlimited: false, remaining };
}
