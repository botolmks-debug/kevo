import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getTokenState, isUnlimited, isAdmin } from "@/lib/supabase/tokens";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { buildVideoScript } from "@/lib/ai/videoScript";
import { submitVideo, heygenConfigured } from "@/lib/video/heygen";
import { insertVideoJob } from "@/lib/supabase/videoJobs";

export const runtime = "nodejs";
export const maxDuration = 120;

// Video jauh lebih mahal dari gambar → default 8 token. Bisa diubah lewat env.
const VIDEO_TOKEN_COST = Number(process.env.VIDEO_TOKEN_COST || "8");
const VALID_RATIOS = ["9:16", "1:1", "4:5"] as const;
type Ratio = (typeof VALID_RATIOS)[number];

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase belum terhubung." }, { status: 503 });
  }
  if (!presence.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di server." }, { status: 503 });
  }
  if (!heygenConfigured()) {
    return NextResponse.json({ error: "HEYGEN_API_KEY belum diisi di server." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const caption = typeof b.caption === "string" ? b.caption.trim() : "";
  const ratio: Ratio =
    typeof b.ratio === "string" && (VALID_RATIOS as readonly string[]).includes(b.ratio)
      ? (b.ratio as Ratio)
      : "9:16";
  const sourceContentId = typeof b.sourceContentId === "string" ? b.sourceContentId : null;
  if (!caption) {
    return NextResponse.json({ error: "Caption/naskah sumber wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  // Pastikan token cukup SEBELUM memanggil HeyGen (video berbayar).
  if (!isUnlimited(user.email)) {
    const state = await getTokenState(supabase, user.id, user.email);
    const have = state.tokens ?? 0;
    if (have < VIDEO_TOKEN_COST) {
      return NextResponse.json(
        { error: `Butuh ${VIDEO_TOKEN_COST} token untuk 1 video, sisa tokenmu ${have}.` },
        { status: 402 },
      );
    }
  }

  // 1) Caption → naskah lisan ~15 detik
  const scriptRes = await buildVideoScript(caption);
  if (!scriptRes.ok) return NextResponse.json({ error: scriptRes.error }, { status: 502 });

  // 2) Submit job ke HeyGen
  const submit = await submitVideo({ script: scriptRes.script, ratio });
  if (!submit.ok) return NextResponse.json({ error: submit.error }, { status: 502 });

  const service = createServiceRoleClient();

  // 3) Potong token (setelah submit berhasil). Unlimited → hanya dicatat.
  if (!isUnlimited(user.email)) {
    const state = await getTokenState(service, user.id, user.email);
    const have = state.tokens ?? 0;
    await service
      .from("business_profile")
      .update({ tokens: Math.max(0, have - VIDEO_TOKEN_COST) })
      .eq("business_id", user.id);
  }
  try {
    await service.from("token_usage").insert({ business_id: user.id, action: "Video" });
  } catch {
    // best-effort logging
  }

  // 4) Simpan job (service role; kepemilikan dijaga di kode via business_id)
  const jobRes = await insertVideoJob(service, {
    businessId: user.id,
    sourceContentId,
    heygenVideoId: submit.videoId,
    script: scriptRes.script,
    ratio,
  });
  if (!jobRes.ok) return NextResponse.json({ error: jobRes.error }, { status: 502 });

  return NextResponse.json({ jobId: jobRes.row.id, script: scriptRes.script, status: "processing" });
}
