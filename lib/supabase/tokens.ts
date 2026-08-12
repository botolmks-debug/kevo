import type { SupabaseClient } from "@supabase/supabase-js";

/** Email yang mendapat token TAK TERBATAS (tidak pernah dipotong). */
const UNLIMITED_EMAILS = new Set(["botolmks@gmail.com"]);
/** Jatah token default untuk user baru. */
export const DEFAULT_TOKENS = 10;

export function isUnlimited(email?: string | null): boolean {
  return !!email && UNLIMITED_EMAILS.has(email.trim().toLowerCase());
}

/** Email yang boleh membuka menu Admin. */
const ADMIN_EMAILS = new Set(["botolmks@gmail.com"]);
export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase());
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
  action?: string,
): Promise<ConsumeResult> {
  // Catat waktu pemakaian (untuk menu Admin). Diabaikan kalau tabel belum ada.
  const logUsage = async () => {
    try {
      await client.from("token_usage").insert({ business_id: businessId, action: action ?? null });
    } catch {
      // best-effort — jangan gagalkan aksi kalau logging error
    }
  };

  if (isUnlimited(email)) {
    await logUsage();
    return { ok: true, unlimited: true, remaining: null };
  }

  const { data, error } = await client.rpc("consume_token", { p_business_id: businessId });
  if (error) {
    console.error(`consumeToken rpc failed: ${error.message}`);
    return { ok: false, error: "Gagal memproses token. Coba lagi." };
  }
  const remaining = typeof data === "number" ? data : -1;
  if (remaining < 0) {
    return { ok: false, error: "Token AI habis. Fitur AI tidak bisa dipakai sampai token diisi ulang." };
  }
  await logUsage();
  return { ok: true, unlimited: false, remaining };
}

/**
 * Kembalikan 1 token — dipanggil saat token SUDAH dipotong (consumeToken
 * berhasil) tapi langkah AI setelahnya GAGAL (mis. "Layanan AI sedang
 * sibuk", error render, dll). Tanpa ini, user rugi token setiap kali AI
 * gagal walau tidak dapat hasil apa pun. Unlimited → tidak perlu refund.
 */
export async function refundToken(
  client: SupabaseClient,
  businessId: string,
  email?: string | null,
): Promise<void> {
  if (isUnlimited(email)) return;
  try {
    const { data } = await client
      .from("business_profile")
      .select("tokens")
      .eq("business_id", businessId)
      .maybeSingle();
    const current = typeof (data as { tokens?: number } | null)?.tokens === "number"
      ? (data as { tokens: number }).tokens
      : DEFAULT_TOKENS - 1;
    await client.from("business_profile").update({ tokens: current + 1 }).eq("business_id", businessId);
  } catch {
    // best-effort — jangan sampai kegagalan refund menutupi error asli
  }
}

/**
 * Potong BEBERAPA token sekaligus secara atomik (dipakai fitur Carousel =
 * CAROUSEL_TOKEN_COST). Lewat RPC consume_tokens (lihat migration
 * 0009_consume_tokens.sql): update ... set tokens = tokens - p_amount
 * where tokens >= p_amount returning tokens; null/-1 = token kurang.
 * Unlimited -> tidak dipotong.
 */
export async function consumeTokens(
  client: SupabaseClient,
  businessId: string,
  amount: number,
  email?: string | null,
  action?: string,
): Promise<ConsumeResult> {
  const logUsage = async () => {
    try {
      await client.from("token_usage").insert({ business_id: businessId, action: action ?? null });
    } catch {
      // best-effort
    }
  };

  if (isUnlimited(email)) {
    await logUsage();
    return { ok: true, unlimited: true, remaining: null };
  }

  const { data, error } = await client.rpc("consume_tokens", {
    p_business_id: businessId,
    p_amount: amount,
  });
  if (error) {
    console.error(`consumeTokens rpc failed: ${error.message}`);
    return {
      ok: false,
      error:
        "Gagal memproses token. Kalau ini terus terjadi, RPC consume_tokens kemungkinan belum dibuat (jalankan migration 0009).",
    };
  }
  const remaining = typeof data === "number" ? data : -1;
  if (remaining < 0) {
    return {
      ok: false,
      error: `Token AI tidak cukup (butuh ${amount}). Isi ulang token dulu untuk memakai fitur ini.`,
    };
  }
  await logUsage();
  return { ok: true, unlimited: false, remaining };
}

/**
 * Kembalikan BEBERAPA token — pasangan consumeTokens untuk jalur gagal
 * (AI teks/gambar gagal setelah token terpotong). Unlimited -> tidak perlu.
 */
export async function refundTokens(
  client: SupabaseClient,
  businessId: string,
  amount: number,
  email?: string | null,
): Promise<void> {
  if (isUnlimited(email)) return;
  try {
    const { data } = await client
      .from("business_profile")
      .select("tokens")
      .eq("business_id", businessId)
      .maybeSingle();
    const current = typeof (data as { tokens?: number } | null)?.tokens === "number"
      ? (data as { tokens: number }).tokens
      : 0;
    await client.from("business_profile").update({ tokens: current + amount }).eq("business_id", businessId);
  } catch {
    // best-effort — jangan sampai kegagalan refund menutupi error asli
  }
}
