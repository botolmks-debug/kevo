import { NextResponse } from "next/server";
import { checkSupabaseEnvPresence } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: checkSupabaseEnvPresence(process.env),
  });
}
