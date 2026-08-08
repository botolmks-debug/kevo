import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { chatCompletion } from "@/lib/support/geminiChat";
import { buildSupportSystemPrompt } from "@/lib/support/faq";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Set email unlimited di sini (samakan dengan lib/supabase/tokens.ts)
const UNLIMITED_EMAILS = new Set(["botolmks@gmail.com"]);

type ChatMessage = { role: "user" | "assistant"; content: string };
type RequestBody = { message: string; sessionId: string; history?: ChatMessage[] };

function isValidBody(b: unknown): b is RequestBody {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as RequestBody).message === "string" &&
    (b as RequestBody).message.trim().length > 0 &&
    typeof (b as RequestBody).sessionId === "string" &&
    (b as RequestBody).sessionId.length > 0
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON valid" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "message & sessionId wajib" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const service = createServiceRoleClient();

  // Ambil konteks user: token + generate terakhir
  const { data: profile } = await service
    .from("business_profile")
    .select("tokens")
    .eq("business_id", user.id)
    .maybeSingle();

  const isUnlimited = user.email ? UNLIMITED_EMAILS.has(user.email) : false;

  const { data: lastGen } = await service
    .from("generated_content")
    .select("jenis, status, created_at")
    .eq("business_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Simpan pesan user
  await service.from("support_conversations").insert({
    business_id: user.id,
    user_email: user.email,
    role: "user",
    message: body.message,
    session_id: body.sessionId,
  });

  // Bangun prompt
  const systemPrompt = buildSupportSystemPrompt({
    email: user.email,
    tokens: isUnlimited ? "unlimited" : (profile?.tokens as number | undefined),
    recentGenerate: lastGen
      ? {
          jenis: lastGen.jenis as string,
          status: lastGen.status as string,
          createdAt: new Date(lastGen.created_at as string).toLocaleString("id-ID"),
        }
      : null,
  });

  const history = (body.history ?? []).slice(-6);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: body.message },
  ];

  const result = await chatCompletion(messages);

  if (!result.ok) {
    // Simpan info error di transkrip, balas ramah ke user
    await service.from("support_conversations").insert({
      business_id: user.id,
      user_email: user.email,
      role: "system",
      message: `AI error: ${result.error}`,
      session_id: body.sessionId,
    });
    return NextResponse.json({
      reply:
        "Maaf, saya sedang kesulitan menjawab. Coba klik 'Butuh bantuan manusia' agar admin bisa membantu langsung.",
      failed: true,
    });
  }

  // Simpan reply assistant
  await service.from("support_conversations").insert({
    business_id: user.id,
    user_email: user.email,
    role: "assistant",
    message: result.text,
    session_id: body.sessionId,
  });

  return NextResponse.json({ reply: result.text });
}
