/**
 * PATCH /api/content/[id]  { scheduledDate: "YYYY-MM-DD" | null }
 * Set / batalkan tanggal jadwal posting untuk Kalender Konten.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { setContentSchedule } from "@/lib/supabase/generatedContent";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  let body: { scheduledDate?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const date = body.scheduledDate ?? null;
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD." }, { status: 400 });
  }

  const service = createServiceRoleClient();

  // Verifikasi kepemilikan sebelum ubah.
  const { data: row, error: fetchErr } = await service
    .from("generated_content")
    .select("business_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 502 });
  if (!row) return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  if ((row as { business_id: string }).business_id !== user.id) {
    return NextResponse.json({ error: "Bukan milik akun ini." }, { status: 403 });
  }

  const result = await setContentSchedule(service, id, date);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, scheduledDate: result.row.scheduled_date ?? null });
}
