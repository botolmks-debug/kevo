import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { verifyMidtransSignature } from "@/lib/payment/midtrans";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment Notification URL Midtrans (set di Midtrans Dashboard → Settings →
 * Configuration → Payment Notification URL):
 *   https://keposting.com/api/topup-midtrans/notification
 *
 * Catatan lokal: Midtrans TIDAK bisa memanggil localhost — jadi saat tes di
 * lokal, pembayaran sandbox sukses tapi token tidak otomatis bertambah.
 * Itu normal; di produksi (URL publik) token bertambah otomatis.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!verifyMidtransSignature(body)) {
    return NextResponse.json({ error: "signature tidak valid" }, { status: 403 });
  }

  const orderId = body.order_id;
  const status = body.transaction_status;
  const fraud = body.fraud_status;
  const paid = status === "settlement" || (status === "capture" && fraud === "accept");
  const failed = status === "deny" || status === "cancel" || status === "expire";

  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("topup_orders")
    .select("order_id, business_id, tokens, status")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "order tidak ditemukan" }, { status: 404 });

  // IDEMPOTEN: order yang sudah paid tidak diproses lagi (Midtrans bisa
  // mengirim notifikasi yang sama berkali-kali).
  if (order.status === "paid") return NextResponse.json({ ok: true, note: "sudah diproses" });

  if (failed) {
    await supabase.from("topup_orders").update({ status: "failed" }).eq("order_id", orderId);
    return NextResponse.json({ ok: true });
  }
  if (!paid) return NextResponse.json({ ok: true, note: `status ${status} diabaikan` });

  // Tandai paid DULU (kunci idempotensi), baru tambah token.
  const { error: markError } = await supabase
    .from("topup_orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "pending");
  if (markError) {
    await logError({
      businessId: order.business_id,
      route: "topup-midtrans-notification",
      error: new Error(markError.message),
      metadata: { orderId },
    });
    return NextResponse.json({ error: "gagal update order" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("business_profile")
    .select("tokens")
    .eq("business_id", order.business_id)
    .maybeSingle();
  const current = typeof (profile as { tokens?: number } | null)?.tokens === "number"
    ? (profile as { tokens: number }).tokens
    : 0;
  const { error: tokenError } = await supabase
    .from("business_profile")
    .update({ tokens: current + order.tokens })
    .eq("business_id", order.business_id);
  if (tokenError) {
    await logError({
      businessId: order.business_id,
      route: "topup-midtrans-notification",
      error: new Error(tokenError.message),
      metadata: { orderId, step: "add_tokens" },
    });
    return NextResponse.json({ error: "gagal menambah token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, added: order.tokens });
}
