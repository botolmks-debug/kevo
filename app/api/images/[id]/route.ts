import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { deleteImage } from "@/lib/supabase/images";
import { checkSupabaseEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Supabase service role belum terhubung: env SUPABASE_SERVICE_ROLE_KEY belum diisi.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const client = createServiceRoleClient();
  const result = await deleteImage(client, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
