// app/api/instagram/callback/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { exchangeCodeForToken, listIgAccounts } from "@/lib/instagram/api";
import { upsertConnection } from "@/lib/supabase/igConnections";
import { getRouteUser } from "@/lib/instagram/serverUser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyState(state: string, userId: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [uid, nonce, sig] = parts;
  if (uid !== userId) return false;
  const expect = crypto
    .createHmac("sha256", process.env.META_APP_SECRET || "dev")
    .update(`${uid}.${nonce}`)
    .digest("hex")
    .slice(0, 16);
  return sig === expect;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const fbError = url.searchParams.get("error_description");

  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard?${q}`, req.url));

  if (fbError) return back(`ig=err&msg=${encodeURIComponent(fbError)}`);
  if (!code) return back("ig=err&msg=Tidak%20ada%20code");

  const user = await getRouteUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!verifyState(state, user.id)) return back("ig=err&msg=State%20tidak%20valid");

  try {
    console.log("[IG] Mulai exchangeCodeForToken");
    const { accessToken, expiresAt } = await exchangeCodeForToken(code);
    console.log("[IG] Token OK, panjang:", accessToken?.length, "expires:", expiresAt?.toISOString());

    // Test langsung Graph API dengan token ini
    try {
      const testRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`,
        { cache: "no-store" }
      );
      const testJson = await testRes.json();
      console.log("[IG] /me test:", JSON.stringify(testJson));
    } catch (te) {
      console.log("[IG] /me test GAGAL:", te instanceof Error ? te.message : te);
    }

    // Test /me/accounts
    try {
      const accRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=100&access_token=${accessToken}`,
        { cache: "no-store" }
      );
      const accJson = await accRes.json();
      console.log("[IG] /me/accounts raw:", JSON.stringify(accJson));
    } catch (ae) {
      console.log("[IG] /me/accounts GAGAL:", ae instanceof Error ? ae.message : ae);
    }

    // Test /me/businesses
    try {
      const bizRes = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?limit=50&access_token=${accessToken}`,
        { cache: "no-store" }
      );
      const bizJson = await bizRes.json();
      console.log("[IG] /me/businesses raw:", JSON.stringify(bizJson));
    } catch (be) {
      console.log("[IG] /me/businesses GAGAL:", be instanceof Error ? be.message : be);
    }

    const accounts = await listIgAccounts(accessToken);
    console.log("[IG] accounts found:", JSON.stringify(accounts));

    if (accounts.length === 0) {
      return back(
        "ig=err&msg=" +
          encodeURIComponent(
            "Tidak ditemukan akun Instagram Business yang tertaut ke Facebook Page. Ubah akun IG ke Business/Creator lalu tautkan ke Page dulu."
          )
      );
    }

    const acc = accounts[0];
    await upsertConnection({
      business_id: user.id,
      ig_user_id: acc.igUserId,
      ig_username: acc.igUsername,
      page_id: acc.pageId,
      page_name: acc.pageName,
      access_token: accessToken,
      token_expires_at: expiresAt.toISOString(),
    });

    return back("ig=ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghubungkan";
    console.log("[IG] ERROR UTAMA:", msg);
    return back(`ig=err&msg=${encodeURIComponent(msg)}`);
  }
}
