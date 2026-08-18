import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Callback khusus LOGIN SOSIAL (Google OAuth). Berbeda dari /auth/confirm:
 * di sini sesi DIPERTAHANKAN (user langsung masuk), karena login Google sudah
 * membuktikan identitas — tidak perlu langkah "cek email + login ulang".
 *
 * Alur: tombol "Lanjut dengan Google" -> Google -> Supabase -> redirect ke
 * sini dengan ?code=... -> tukar code jadi sesi -> arahkan ke /onboarding.
 * (Middleware/halaman akan mengarahkan user lama ke tujuan yang sesuai.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Gagal / code tidak ada -> kembali ke login dengan pesan stabil.
  return NextResponse.redirect(`${origin}/login?error=login.oauthFailed`);
}
