import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isAdmin } from "@/lib/supabase/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const svc = createServiceRoleClient();
  const { data } = await svc.from("app_settings").select("value").eq("key", "maintenance_mode").single();
  return NextResponse.json({ maintenance: data?.value === "true" });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { maintenance } = await req.json() as { maintenance: boolean };
  const svc = createServiceRoleClient();
  await svc.from("app_settings").upsert({
    key: "maintenance_mode",
    value: maintenance ? "true" : "false",
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, maintenance });
}
