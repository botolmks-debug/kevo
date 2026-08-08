import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createLemonSqueezyCheckout } from "@/lib/payment/lemonsqueezy";
import { findPackageById } from "@/lib/payment/lemonsqueezy-packages";
import { logError } from "@/lib/monitoring/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = { packageId?: string };

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.packageId) {
    return NextResponse.json({ error: "packageId wajib" }, { status: 400 });
  }

  const pkg = findPackageById(body.packageId);
  if (!pkg) return NextResponse.json({ error: "package tidak ditemukan" }, { status: 400 });

  if (pkg.variantId.startsWith("REPLACE_ME")) {
    return NextResponse.json(
      {
        error:
          "Package belum di-config: variantId belum diset di lemonsqueezy-packages.ts. Update variantId dari LS dashboard dulu.",
      },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    return NextResponse.json({ error: "LEMONSQUEEZY_STORE_ID not set" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://keposting.com";
  const successUrl = `${siteUrl}/topup?status=success`;

  const result = await createLemonSqueezyCheckout({
    variantId: pkg.variantId,
    storeId,
    userEmail: user.email ?? "",
    userId: user.id,
    customData: {
      package_id: pkg.id,
      tokens: String(pkg.tokens),
    },
    successUrl,
  });

  if (!result.ok) {
    await logError({
      businessId: user.id,
      route: "topup-ls",
      error: new Error(result.error),
      metadata: { packageId: body.packageId },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Simpan pending order — webhook akan update jadi 'paid' setelah bayar
  const service = createServiceRoleClient();
  const { error: insertError } = await service.from("topup_ls_orders").insert({
    ls_order_id: result.orderId,
    business_id: user.id,
    package_id: pkg.id,
    tokens: pkg.tokens,
    amount_usd: pkg.priceUsd,
    status: "pending",
  });

  if (insertError) {
    // Tidak fatal — checkout URL sudah ada, biar user tetap bisa bayar
    await logError({
      businessId: user.id,
      route: "topup-ls",
      error: new Error(`Insert order failed: ${insertError.message}`),
      metadata: { lsOrderId: result.orderId },
    });
  }

  return NextResponse.json({ checkoutUrl: result.url });
}
