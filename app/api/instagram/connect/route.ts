// app/api/instagram/connect/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildAuthUrl } from "@/lib/instagram/api";
import { igFeatureAllowed } from "@/lib/instagram/access";
import { getRouteUser } from "@/lib/instagram/serverUser";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getRouteUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!igFeatureAllowed(user.email)) {
    return NextResponse.redirect(new URL("/dashboard?ig=locked", req.url));
  }

  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${user.id}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", process.env.META_APP_SECRET || "dev")
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  const state = `${payload}.${sig}`;

  return NextResponse.redirect(buildAuthUrl(state));
}
