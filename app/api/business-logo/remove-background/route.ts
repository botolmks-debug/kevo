import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeLogoBackground } from "@/lib/supabase/logo";
import { checkSupabaseEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

const VALID_VARIANTS = ["dark", "light"] as const;
type LogoVariant = typeof VALID_VARIANTS[number];

// Hapus background logo berbasis KODE (deteksi warna solid + flood-fill,
// lihat lib/images/backgroundRemoval.ts) — BUKAN AI, jadi cepat & gratis.
// Route ini sebelumnya ada tapi TIDAK autentikasi user & tidak menerima
// variant (selalu jatuh ke akun dev default) — sekarang diperbaiki penuh.
export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase belum terhubung." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }
  const variantRaw = (body as { variant?: unknown })?.variant ?? "dark";
  if (!VALID_VARIANTS.includes(variantRaw as LogoVariant)) {
    return NextResponse.json({ error: "Variant tidak valid (dark/light)." }, { status: 400 });
  }
  const variant = variantRaw as LogoVariant;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const result = await removeLogoBackground(supabase, user.id, variant);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ url: result.url });
}
