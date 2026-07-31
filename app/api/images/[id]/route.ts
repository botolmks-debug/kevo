import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { deleteImage } from "@/lib/supabase/images";
import { checkSupabaseEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role belum terhubung: env SUPABASE_SERVICE_ROLE_KEY belum diisi." },
      { status: 503 },
    );
  }

  const { id } = await params;

  // Verifikasi pemilik lewat sesi login dulu, baru hapus pakai service role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const client = createServiceRoleClient();

  const { data: row, error: fetchError } = await client
    .from("images")
    .select("business_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 502 });
  }
  if (!row) {
    return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
  }
  if (row.business_id !== user.id) {
    return NextResponse.json({ error: "Tidak boleh menghapus gambar milik akun lain." }, { status: 403 });
  }

  const result = await deleteImage(client, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}