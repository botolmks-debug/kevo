/**
 * POST /api/video/cerita/singkat/naskah — fitur umum (semua user login).
 * "Ringkas 15 Detik": ubah CAPTION konten yang sudah ada jadi 1 naskah VO
 * (hook + ringkasan, hashtag dibuang). TIDAK generate gambar baru — beda
 * dari /api/video/cerita/storyboard (5 slide dari nol).
 *
 * Token: dipotong FLAT di sini (naskah + TTS sekali jalan dianggap 1 paket,
 * sama pola-nya dengan storyboard cerita 5-slide yang menggabung biaya TTS
 * ke langkah pertama).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeTokens, refundTokens, isAdmin } from "@/lib/supabase/tokens";
import { logError } from "@/lib/monitoring/errorLog";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { buildCeritaSingkatPrompt } from "@/lib/ai/ceritaSingkatPrompt";
import type { GeneratedContentJenis } from "@/lib/supabase/generatedContent";

export const runtime = "nodejs";
export const maxDuration = 60;

// Biaya flat 1 token (naskah AI + TTS ElevenLabs sekali panggil di step
// berikutnya sudah termasuk, tidak dipotong 2x) — jauh lebih murah dari
// Cerita Produk (6 token) karena TIDAK generate gambar AI sama sekali.
export const CERITA_SINGKAT_TOKEN_COST = 1;

type RequestBody = { caption?: string; jenis?: GeneratedContentJenis; language?: "id" | "en" };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: "Fitur Video Cerita khusus admin (sementara)." }, { status: 403 });

  let body: RequestBody = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as RequestBody;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  if (!caption) return NextResponse.json({ error: "Caption kosong — pilih konten dulu." }, { status: 400 });
  const jenis: GeneratedContentJenis | undefined = body.jenis;
  const language = body.language === "en" ? "en" : "id";

  const token = await consumeTokens(supabase, user.id, CERITA_SINGKAT_TOKEN_COST, user.email, "Video Cerita Singkat - naskah");
  if (!token.ok) return NextResponse.json({ error: token.error }, { status: 402 });

  const authedUser = user;
  async function fail(error: string, status: number) {
    await refundTokens(supabase, authedUser.id, CERITA_SINGKAT_TOKEN_COST, authedUser.email);
    await logError({
      businessId: authedUser.id,
      route: "video-cerita-singkat-naskah",
      error: new Error(error),
      metadata: { status, language, jenis },
    });
    return NextResponse.json({ error }, { status });
  }

  const result = await generateJsonContent(buildCeritaSingkatPrompt(caption, jenis, language));
  if (!result.ok) return fail(result.error, 502);
  const script = typeof result.data.script === "string" ? result.data.script.trim() : "";
  if (!script) return fail("AI tidak mengembalikan naskah. Coba lagi.", 502);

  return NextResponse.json({ script, tokensRemaining: token.remaining });
}
