import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  const keepSession = next.startsWith("/reset-password");

  // Buat response redirect DULU — lalu pasang cookie Supabase ke dalamnya.
  // Ini krusial di Route Handler: tanpa ini cookie sesi tidak ikut redirect
  // dan halaman berikutnya (mis. /reset-password) tidak mengenal user.
  const redirectUrl = keepSession
    ? `${origin}${next}`
    : `${origin}/login?verified=1`;
  const errorUrl = `${origin}/login?error=login.linkExpired`;

  const cookieStore = await cookies();

  // Supabase client yang menulis cookie langsung ke cookieStore next/headers
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) verified = true;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) verified = true;
  }

  if (!verified) {
    return NextResponse.redirect(errorUrl);
  }

  if (!keepSession) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?verified=1`);
  }

  // Untuk reset-password: copy semua cookie (termasuk sesi Supabase)
  // ke dalam response redirect supaya /reset-password bisa updateUser.
  const response = NextResponse.redirect(redirectUrl);
  cookieStore.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  return response;
}
