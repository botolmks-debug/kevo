import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint ringan untuk widget cek apakah user sedang login.
// Widget akan tampil hanya kalau endpoint ini balikkan 200.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  return NextResponse.json({ ok: true, email: user.email });
}
