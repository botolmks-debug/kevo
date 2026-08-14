import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Tujuan link konfirmasi email (signup, magic link, RESET PASSWORD, dll) —
 * Supabase mengarahkan browser ke sini setelah memvalidasi token di sisi
 * mereka. Sebelum route ini dibuat, link konfirmasi TIDAK PUNYA TUJUAN sama
 * sekali di app kita -> selalu error saat diklik.
 *
 * Supabase bisa kirim salah satu dari dua bentuk parameter tergantung versi
 * template/flow: `code` (PKCE, umum untuk @supabase/ssr) atau `token_hash`
 * + `type` (format lama). Route ini menangani dua-duanya.
 *
 * Query `next` opsional menentukan tujuan SETELAH sesi berhasil dibuat —
 * dipakai reset-password (next=/reset-password) supaya user mendarat di
 * form password baru dengan sesi yang SUDAH aktif (bukan menunggu event
 * client-side yang rapuh). Default "/" untuk konfirmasi signup biasa.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const supabase = await createClient();

  // next=/reset-password BUTUH sesi aktif (user langsung isi password baru),
  // jadi untuk kasus itu sesi dipertahankan. Untuk konfirmasi signup biasa
  // (next default "/"), pakai Opsi B: aktifkan akun lalu SIGN OUT + arahkan ke
  // /login, supaya orang yang cuma bisa baca email TIDAK otomatis masuk akun —
  // akses tetap butuh password.
  const keepSession = next.startsWith("/reset-password");

  async function onVerified() {
    if (keepSession) return NextResponse.redirect(`${origin}${next}`);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?verified=1`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return await onVerified();
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return await onVerified();
  }

  // Link tidak valid/kedaluwarsa -> lempar ke login dengan pesan singkat,
  // daripada menampilkan halaman error mentah.
  return NextResponse.redirect(`${origin}/login?error=Link%20verifikasi%20tidak%20valid%20atau%20sudah%20kedaluwarsa`);
}
