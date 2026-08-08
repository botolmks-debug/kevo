import { NextResponse } from "next/server";
import { logError } from "@/lib/monitoring/errorLog";

export async function GET() {
  await logError({
    route: "test-log",
    error: new Error("Test error dari endpoint /api/test-log — abaikan"),
    metadata: { test: true, timestamp: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, message: "Error dicatat ke error_logs" });
}