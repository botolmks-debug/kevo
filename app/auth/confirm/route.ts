import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Tujuan link konfirmasi email (signup, magic link, reset password lama,
 * dll) — Supabase mengarahkan browser ke sini setelah memvalidasi token di
 * sisi mereka. Sebelum route ini dibuat, link konfirmasi TIDAK PUNYA
 * TUJUAN sama sekali di app kita -> selalu error saat diklik.
 *
 * Supabase bisa kirim salah satu dari dua bentuk parameter tergantung versi
 * template/flow: `code` (PKCE, umum untuk @supabase/ssr) atau `token_hash`
 * + `type` (format lama). Route ini menangani dua-duanya.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  // Link tidak valid/kedaluwarsa -> lempar ke login dengan pesan singkat,
  // daripada menampilkan halaman error mentah.
  return NextResponse.redirect(`${origin}/login?error=Link%20verifikasi%20tidak%20valid%20atau%20sudah%20kedaluwarsa`);
}
