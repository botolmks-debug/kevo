import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnapTransaction, findMidtransPackage } from "@/lib/payment/midtrans";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = { packageId?: string };

/** POST { packageId } → { snapToken } untuk popup pembayaran Midtrans. */
export async function POST(request: NextRequest) {
  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const pkg = findMidtransPackage(body.packageId ?? "");
  if (!pkg) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  // order_id unik; package tercatat di tabel (bukan diparse dari order_id).
  const orderId = `kp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Catat order pending dulu — webhook nanti menandainya paid + menambah token.
  const { error: insertError } = await supabase.from("topup_orders").insert({
    order_id: orderId,
    business_id: user.id,
    package_id: pkg.id,
    tokens: pkg.tokens,
    gross_amount: pkg.priceIdr,
  });
  if (insertError) {
    await logError({
      businessId: user.id,
      route: "topup-midtrans",
      error: new Error(insertError.message),
      metadata: { step: "insert_order" },
    });
    return NextResponse.json(
      { error: "Gagal mencatat order. Kalau terus terjadi, tabel topup_orders kemungkinan belum dibuat (migration 0011)." },
      { status: 500 },
    );
  }

  const result = await createSnapTransaction({
    orderId,
    grossAmount: pkg.priceIdr,
    itemName: `Keposting — ${pkg.tokens} Token AI (${pkg.label})`,
    customerEmail: user.email ?? "user@keposting.com",
    userId: user.id,
  });
  if (!result.ok) {
    await logError({
      businessId: user.id,
      route: "topup-midtrans",
      error: new Error(result.error),
      metadata: { step: "create_snap" },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ snapToken: result.token, orderId });
}
