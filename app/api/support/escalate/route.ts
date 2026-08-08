import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendEscalationEmail } from "@/lib/support/email";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const UNLIMITED_EMAILS = new Set(["botolmks@gmail.com"]);

type RequestBody = { sessionId: string; message: string };

function isValidBody(b: unknown): b is RequestBody {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as RequestBody).sessionId === "string" &&
    typeof (b as RequestBody).message === "string" &&
    (b as RequestBody).message.trim().length > 0
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
    return NextResponse.json({ error: "sessionId & message wajib" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const service = createServiceRoleClient();

  // Ambil transkrip percakapan sesi ini
  const { data: transcript } = await service
    .from("support_conversations")
    .select("role, message, created_at")
    .eq("session_id", body.sessionId)
    .order("created_at", { ascending: true });

  // Ambil info user
  const { data: profile } = await service
    .from("business_profile")
    .select("tokens")
    .eq("business_id", user.id)
    .maybeSingle();

  const isUnlimited = user.email ? UNLIMITED_EMAILS.has(user.email) : false;

  // Tandai eskalasi di transkrip
  await service.from("support_conversations").insert({
    business_id: user.id,
    user_email: user.email,
    role: "system",
    message: `[ESKALASI] ${body.message}`,
    session_id: body.sessionId,
  });

  // Kirim email ke admin
  const emailResult = await sendEscalationEmail({
    userEmail: user.email ?? "unknown",
    userMessage: body.message,
    transcript: (transcript ?? []).map((t) => ({
      role: t.role as string,
      message: t.message as string,
      created_at: t.created_at as string,
    })),
    userInfo: {
      tokens: isUnlimited ? "unlimited" : (profile?.tokens as number | undefined),
      businessId: user.id,
    },
  });

  if (!emailResult.ok) {
    // Email gagal — tetap balas OK ke user, tapi log ke error_logs supaya admin tahu
    await logError({
      businessId: user.id,
      route: "support-escalate",
      error: new Error(emailResult.error),
      metadata: { sessionId: body.sessionId },
    });
    return NextResponse.json({
      ok: true,
      note: "Pesan tercatat di sistem. Admin akan cek langsung dalam 24 jam.",
    });
  }

  return NextResponse.json({ ok: true });
}
