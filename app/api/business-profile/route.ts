import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadBusinessProfile, saveBusinessProfile } from "@/lib/supabase/businessProfile";
import { checkSupabaseEnvPresence } from "@/lib/env";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBusinessProfileShape(body: unknown): body is BusinessProfile {
  if (!isRecord(body)) return false;
  if (!isRecord(body.business) || !isRecord(body.offering) || !isRecord(body.positioning)) {
    return false;
  }
  if (!isRecord(body.socials)) return false;
  if (!Array.isArray(body.socials.entries) || !Array.isArray(body.socials.selectedPlatformIds)) {
    return false;
  }
  return typeof body.story === "string";
}

function envErrorResponse() {
  return NextResponse.json(
    { error: "Supabase belum terhubung: env NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." },
    { status: 503 },
  );
}

export async function GET() {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return envErrorResponse();
  }

  const supabase = await createClient();
  const result = await loadBusinessProfile(supabase);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ profile: result.profile });
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return envErrorResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }

  if (!isBusinessProfileShape(body)) {
    return NextResponse.json({ error: "Bentuk profil bisnis tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await saveBusinessProfile(supabase, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
