import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { logError } from "@/lib/monitoring/errorLog";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { getRecentCaptions, buildAntiRepetisiBlock } from "@/lib/ai/antiRepetisi";
import { buildMomenBlock } from "@/lib/ai/momenKalender";
import { buildIdeKreatifPrompt, GEMINI_IDEA_MODEL } from "@/lib/ai/ideKreatifPrompt";
import { isValidIde, normalizeIde, type KreatifIde } from "@/lib/ai/konsepKreatif";
import { sanitizeTitle } from "@/lib/ai/sanitizeTitle";

export const runtime = "nodejs";
export const maxDuration = 180; // teks saja, tapi model ide lebih kuat (lebih lama berpikir)

type RequestBody = { language?: "id" | "en"; avoid?: string[] };

function isValidBody(body: unknown): body is RequestBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  if (b.language !== undefined && b.language !== "id" && b.language !== "en") return false;
  if (b.avoid !== undefined) {
    if (!Array.isArray(b.avoid) || b.avoid.length > 60) return false;
    if (!b.avoid.every((x) => typeof x === "string" && x.length <= 120)) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase belum terhubung." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body tidak valid." }, { status: 400 }); }
  if (!isValidBody(body)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  async function fail(error: string, status: number) {
    await logError({ businessId: user!.id, route: "generate-auto-ideas", error: new Error(error), metadata: { status } });
    return NextResponse.json({ error }, { status });
  }

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return fail(profileResult.error, 502);
  const profile = profileResult.profile;
  if (!profile) return fail("Lengkapi profil bisnis dulu di halaman onboarding.", 400);

  let antiRepetisiBlock = "";
  try {
    antiRepetisiBlock = buildAntiRepetisiBlock(await getRecentCaptions(supabase, user.id));
  } catch {
    // best-effort
  }
  const momenBlock = body.language === "en" ? "" : buildMomenBlock(new Date(Date.now() + 7 * 60 * 60 * 1000));

  const prompt = buildIdeKreatifPrompt({
    profile,
    lang: body.language,
    avoid: body.avoid,
    antiRepetisiBlock,
    momenBlock,
  });

  // Model ide (lebih kuat) + jatah token besar: model "thinking" memakai
  // maxOutputTokens juga untuk berpikir, 2048 default bisa kepotong.
  let result = await generateJsonContent(prompt, { model: GEMINI_IDEA_MODEL, maxOutputTokens: 16384, timeoutMs: 120_000 });
  if (!result.ok) {
    // Cadangan: model teks default, supaya fitur tetap jalan kalau model ide bermasalah.
    console.warn("[ideas] model ide gagal (" + result.error + "), fallback ke model default");
    result = await generateJsonContent(prompt, { maxOutputTokens: 8192, timeoutMs: 60_000 });
  }
  if (!result.ok) return fail(result.error, 502);

  const raw = (result.data as { ideas?: unknown }).ideas;
  const ideas: KreatifIde[] = (Array.isArray(raw) ? raw : [])
    .filter(isValidIde)
    .map((ide) => normalizeIde({ ...ide, judul: sanitizeTitle(ide.judul) }, profile.business.name))
    .slice(0, 5);
  if (ideas.length === 0) return fail("AI tidak mengembalikan ide yang valid. Coba lagi.", 502);

  return NextResponse.json({ ideas });
}
