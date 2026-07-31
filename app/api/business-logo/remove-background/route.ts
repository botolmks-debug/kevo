import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeLogoBackground } from "@/lib/supabase/logo";
import { checkSupabaseEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const result = await removeLogoBackground(supabase);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}
