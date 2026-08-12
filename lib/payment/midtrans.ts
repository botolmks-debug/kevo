import crypto from "crypto";

/**
 * Integrasi Midtrans Snap (top-up token dalam Rupiah).
 * Sandbox vs production diatur env MIDTRANS_IS_PRODUCTION ("true"/"false").
 * Env yang dibutuhkan:
 * - MIDTRANS_SERVER_KEY            (server only)
 * - NEXT_PUBLIC_MIDTRANS_CLIENT_KEY (dipakai snap.js di browser)
 * - MIDTRANS_IS_PRODUCTION=false   (sandbox dulu)
 */

export type MidtransPackage = {
  id: string;
  tokens: number;
  priceIdr: number;
  label: string;
};

// Harga bisa disesuaikan kapan saja — satu-satunya sumber kebenaran harga.
// SINKRON dengan PricingSection di landing page — kalau ubah harga,
// ubah di landing juga (dan di midtrans-packages-client.ts).
export const MIDTRANS_PACKAGES: MidtransPackage[] = [
  { id: "mulai", tokens: 10, priceIdr: 50000, label: "Paket Mulai" },
  { id: "rutin", tokens: 30, priceIdr: 135000, label: "Paket Rutin" },
  { id: "serius", tokens: 60, priceIdr: 240000, label: "Paket Serius" },
];

export function findMidtransPackage(id: string): MidtransPackage | null {
  return MIDTRANS_PACKAGES.find((p) => p.id === id) ?? null;
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function snapBaseUrl(): string {
  return isMidtransProduction() ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
}

export type SnapTransactionResult =
  | { ok: true; token: string; redirectUrl: string }
  | { ok: false; error: string };

/** Buat transaksi Snap → dapat snap token untuk popup pembayaran. */
export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerEmail: string;
  userId: string;
}): Promise<SnapTransactionResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return { ok: false, error: "MIDTRANS_SERVER_KEY belum diisi di .env.local" };

  try {
    const res = await fetch(`${snapBaseUrl()}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: params.orderId, gross_amount: params.grossAmount },
        item_details: [
          { id: params.orderId, price: params.grossAmount, quantity: 1, name: params.itemName },
        ],
        customer_details: { email: params.customerEmail },
        // custom_field1 dipakai webhook untuk tahu token milik siapa.
        custom_field1: params.userId,
      }),
    });
    const data = (await res.json()) as { token?: string; redirect_url?: string; error_messages?: string[] };
    if (!res.ok || !data.token) {
      return { ok: false, error: data.error_messages?.join("; ") ?? `Midtrans error (${res.status})` };
    }
    return { ok: true, token: data.token, redirectUrl: data.redirect_url ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghubungi Midtrans." };
  }
}

/** Verifikasi signature notifikasi Midtrans (sha512(order_id+status_code+gross_amount+serverKey)). */
export function verifyMidtransSignature(body: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || !body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
    return false;
  }
  const expected = crypto
    .createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
    .digest("hex");
  return expected === body.signature_key;
}
