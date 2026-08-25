/**
 * GET /api/video/cerita/voices — fitur umum (semua user login).
 * Daftar suara di akun ElevenLabs, buat dropdown pemilih di halaman
 * Video Cerita Produk (/videocerita). Butuh scope API key "Voices: Read" —
 * kalau belum diaktifkan, balas error yang jelas (bukan daftar kosong diam-diam).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listElevenVoices } from "@/lib/video/elevenlabs";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const result = await listElevenVoices();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ voices: result.voices });
}
