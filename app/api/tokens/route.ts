/** GET /api/tokens -> { unlimited, tokens } sisa token user (untuk TokenSlot). */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokenState } from "@/lib/supabase/tokens";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const state = await getTokenState(supabase, user.id, user.email);
  return NextResponse.json(state);
}
