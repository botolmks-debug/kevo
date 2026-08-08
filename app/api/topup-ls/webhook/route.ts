import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { verifyLemonSqueezySignature } from "@/lib/payment/lemonsqueezy";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // WAJIB pakai raw body untuk verifikasi signature (jangan JSON.parse dulu)
  const raw = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifyLemonSqueezySignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name as string | undefined;
  const custom = payload?.meta?.custom_data as Record<string, string> | undefined;
  const orderId = payload?.data?.id as string | undefined;

  if (!eventName || !orderId) {
    return NextResponse.json({ error: "missing event_name or order id" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  try {
    // ── order_created: user berhasil bayar, tambah token ────────────────
    if (eventName === "order_created") {
      const userId = custom?.user_id;
      const tokens = Number(custom?.tokens ?? 0);

      if (!userId || !tokens) {
        await logError({
          route: "topup-ls-webhook",
          error: new Error("Missing user_id or tokens in custom_data"),
          metadata: { orderId },
        });
        return NextResponse.json({ error: "missing custom_data" }, { status: 400 });
      }

      // Idempotent: kalau order sudah paid, skip (LS bisa retry webhook)
      const { data: existing } = await service
        .from("topup_ls_orders")
        .select("status")
        .eq("ls_order_id", orderId)
        .maybeSingle();

      if (existing?.status === "paid") {
        return NextResponse.json({ ok: true, already_processed: true });
      }

      // Tambah token ke user
      const { data: profile } = await service
        .from("business_profile")
        .select("tokens")
        .eq("business_id", userId)
        .maybeSingle();

      const currentTokens = (profile?.tokens as number) ?? 0;
      const newTokens = currentTokens + tokens;

      const { error: updateProfileError } = await service
        .from("business_profile")
        .update({ tokens: newTokens })
        .eq("business_id", userId);

      if (updateProfileError) {
        await logError({
          businessId: userId,
          route: "topup-ls-webhook",
          error: new Error(`Update profile failed: ${updateProfileError.message}`),
          metadata: { orderId, tokens, currentTokens },
        });
        return NextResponse.json({ error: "update profile failed" }, { status: 500 });
      }

      // Update status order → paid
      await service
        .from("topup_ls_orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("ls_order_id", orderId);

      return NextResponse.json({ ok: true, tokensAdded: tokens, newBalance: newTokens });
    }

    // ── order_refunded: catat saja, admin manual review ────────────────
    if (eventName === "order_refunded") {
      await service
        .from("topup_ls_orders")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("ls_order_id", orderId);

      await logError({
        route: "topup-ls-webhook",
        error: new Error(`Order refunded — perlu review manual`),
        metadata: { orderId, custom },
      });

      return NextResponse.json({ ok: true });
    }

    // Event lain (subscription, dst) — abaikan
    return NextResponse.json({ ok: true, ignored: eventName });
  } catch (e) {
    await logError({
      route: "topup-ls-webhook",
      error: e,
      metadata: { orderId, eventName },
    });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
