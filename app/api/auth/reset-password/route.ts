import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Kirim email reset password menggunakan admin client (service_role) +
 * flowType: "implicit" — menghasilkan token_hash di email, BUKAN code PKCE.
 * token_hash bisa dibuka dari HP/browser manapun.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: true });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const redirectTo = `${origin}/auth/confirm?next=/reset-password`;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false, flowType: "implicit" } }
    );

    await admin.auth.resetPasswordForEmail(email, { redirectTo });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
