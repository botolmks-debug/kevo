// Lemon Squeezy API helper.
// Docs: https://docs.lemonsqueezy.com/api

import crypto from "crypto";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

type CheckoutParams = {
  variantId: string;
  storeId: string;
  userEmail: string;
  userId: string;
  customData?: Record<string, string>;
  successUrl?: string;
};

type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; error: string };

export async function createLemonSqueezyCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) return { ok: false, error: "LEMONSQUEEZY_API_KEY not set" };

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: params.userEmail,
          custom: {
            user_id: params.userId,
            ...params.customData,
          },
        },
        product_options: params.successUrl
          ? { redirect_url: params.successUrl }
          : undefined,
      },
      relationships: {
        store: { data: { type: "stores", id: params.storeId } },
        variant: { data: { type: "variants", id: params.variantId } },
      },
    },
  };

  try {
    const res = await fetch(`${LS_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `LS HTTP ${res.status}: ${text.slice(0, 300)}` };
    }

    const json = await res.json();
    const url = json?.data?.attributes?.url as string | undefined;
    const orderId = json?.data?.id as string | undefined;
    if (!url || !orderId) return { ok: false, error: "LS response missing url/id" };
    return { ok: true, url, orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "LS fetch error" };
  }
}

/**
 * Verifikasi signature webhook LS (HMAC-SHA256).
 * PENTING: pakai raw body (string), bukan JSON.parse-nya.
 */
export function verifyLemonSqueezySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");

  try {
    const digestBuf = Buffer.from(digest, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (digestBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}
