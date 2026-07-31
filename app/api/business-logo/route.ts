import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { uploadLogo, deleteLogo, updateLogoPosition } from "@/lib/supabase/logo";
import { checkSupabaseEnvPresence } from "@/lib/env";
import type { LogoPosition } from "@/lib/onboarding/businessProfile";

export const runtime = "nodejs";

const VALID_POSITIONS: LogoPosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const VALID_VARIANTS = ["dark", "light"] as const;
type LogoVariant = typeof VALID_VARIANTS[number];

function envErrorResponse() {
  return NextResponse.json(
    { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
    { status: 503 },
  );
}

// POST: upload logo (dark atau light)
export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) return envErrorResponse();

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "body harus berupa multipart/form-data" }, { status: 400 }); }

  const file = formData.get("file");
  const variantRaw = formData.get("variant") ?? "dark";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File logo wajib diisi." }, { status: 400 });
  }
  if (!VALID_VARIANTS.includes(variantRaw as LogoVariant)) {
    return NextResponse.json({ error: "Variant tidak valid (dark/light)." }, { status: 400 });
  }
  const variant = variantRaw as LogoVariant;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  // uploadLogo sekarang menerima variant untuk menentukan kolom DB
  const result = await uploadLogo(supabase, { file, businessId: user.id, variant });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ url: result.url });
}

// PATCH: update posisi logo
export async function PATCH(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) return envErrorResponse();

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 }); }

  const position = (body as { position?: unknown })?.position;
  const variantRaw = (body as { variant?: unknown })?.variant ?? "dark";

  if (typeof position !== "string" || !VALID_POSITIONS.includes(position as LogoPosition)) {
    return NextResponse.json({ error: "Posisi logo tidak valid." }, { status: 400 });
  }
  if (!VALID_VARIANTS.includes(variantRaw as LogoVariant)) {
    return NextResponse.json({ error: "Variant tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const result = await updateLogoPosition(supabase, position as LogoPosition, user.id, variantRaw as LogoVariant);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}

// DELETE: hapus logo
export async function DELETE(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Supabase service role belum terhubung." }, { status: 503 });
  }

  const variantRaw = new URL(request.url).searchParams.get("variant") ?? "dark";
  if (!VALID_VARIANTS.includes(variantRaw as LogoVariant)) {
    return NextResponse.json({ error: "Variant tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const client = createServiceRoleClient();
  const result = await deleteLogo(client, user.id, variantRaw as LogoVariant);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}