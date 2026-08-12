import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { buildCheckinPrompt, type CheckinTurn } from "@/lib/ai/checkinPrompt";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI Check-in — TAHAP UJI: hanya untuk akun admin (isAdmin), TANPA potong
 * token. Kalau hasil ujinya bagus, gerbang isAdmin tinggal dilepas dan
 * diberi harga token sendiri.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!isAdmin(user.email)) {
    return { error: NextResponse.json({ error: "Fitur ini masih tahap uji (khusus admin)." }, { status: 403 }) };
  }
  return { supabase, user };
}

/** GET — daftar catatan tersimpan (terbaru dulu). */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const { data, error } = await supabase
    .from("business_notes")
    .select("id, note, created_at")
    .eq("business_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat catatan. Kalau terus terjadi, tabel business_notes kemungkinan belum dibuat (migration 0010)." },
      { status: 500 },
    );
  }
  return NextResponse.json({ notes: data ?? [] });
}

/** DELETE ?id=... — hapus satu catatan. */
export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id catatan wajib diisi." }, { status: 400 });
  const { error } = await supabase.from("business_notes").delete().eq("id", id).eq("business_id", user.id);
  if (error) return NextResponse.json({ error: "Gagal menghapus catatan." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

type PostBody = { message?: string; history?: CheckinTurn[] };

function isCheckinResult(data: Record<string, unknown>): data is { reply: string; note: string | null } {
  if (typeof data.reply !== "string" || data.reply.trim().length === 0) return false;
  if (!("note" in data)) return false;
  if (data.note !== null && typeof data.note !== "string") return false;
  return true;
}

/** POST { message, history } → { reply, savedNote } */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  let body: PostBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as PostBody;
  } catch {
    // ditolak di validasi bawah
  }
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  const history = Array.isArray(body.history)
    ? body.history
        .filter((t): t is CheckinTurn =>
          !!t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string")
        .slice(-8)
    : [];

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.profile) {
    return NextResponse.json({ error: "Lengkapi profil bisnis dulu di onboarding." }, { status: 400 });
  }

  const result = await generateJsonContent(buildCheckinPrompt(profileResult.profile, history, message));
  if (!result.ok) {
    await logError({ businessId: user.id, route: "checkin", error: new Error(result.error), metadata: {} });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  if (!isCheckinResult(result.data)) {
    return NextResponse.json({ error: "AI membalas format tidak lengkap. Coba lagi." }, { status: 502 });
  }

  // Simpan catatan (kalau ada) — best-effort: kegagalan simpan tidak
  // menggagalkan balasan chat.
  let savedNote: { id: string; note: string; created_at: string } | null = null;
  const noteText = result.data.note?.trim();
  if (noteText) {
    const { data } = await supabase
      .from("business_notes")
      .insert({ business_id: user.id, note: noteText.slice(0, 300) })
      .select("id, note, created_at")
      .maybeSingle();
    savedNote = (data as typeof savedNote) ?? null;
  }

  return NextResponse.json({ reply: result.data.reply, savedNote });
}
