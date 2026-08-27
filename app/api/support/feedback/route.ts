import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendFeedbackEmail } from "@/lib/support/feedbackEmail";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

type RequestBody = { name?: string; email?: string; message: string; page?: string };

function isValidBody(b: unknown): b is RequestBody {
  return (
    typeof b === "object" &&
    b !== null &&
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
    return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
  }

  const message = body.message.trim();
  if (message.length > 4000) {
    return NextResponse.json({ error: "Pesan terlalu panjang (maks 4000 karakter)" }, { status: 400 });
  }

  // Login opsional — kalau user sedang login, emailnya dipakai sebagai fallback reply-to.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await sendFeedbackEmail({
    name: body.name,
    email: body.email,
    message,
    userEmail: user?.email ?? null,
    page: body.page,
  });

  if (!result.ok) {
    await logError({
      businessId: user?.id ?? null,
      route: "support-feedback",
      error: new Error(result.error),
      metadata: { name: body.name, email: body.email },
    });
    return NextResponse.json({ error: "Gagal mengirim. Coba lagi nanti." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
