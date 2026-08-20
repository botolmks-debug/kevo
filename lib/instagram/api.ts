// lib/instagram/api.ts
// Helper Meta Graph API: OAuth + pencarian akun IG Business.
// Scope diperluas: business_management diperlukan bila Page dikelola lewat Business Manager.

const GRAPH = "https://graph.facebook.com/v21.0";

export const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "business_management",
].join(",");

const APP_ID = process.env.META_APP_ID || "";
const APP_SECRET = process.env.META_APP_SECRET || "";

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: IG_SCOPES,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const p = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}${path}?${p.toString()}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Graph API error di ${path}`);
  }
  return json;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`;

  // 1) code -> short-lived token
  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    { cache: "no-store" }
  );
  const shortJson = await shortRes.json();
  if (!shortRes.ok || shortJson.error) {
    throw new Error(shortJson?.error?.message || "Gagal tukar code");
  }

  // 2) short-lived -> long-lived (±60 hari)
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: shortJson.access_token,
      }).toString(),
    { cache: "no-store" }
  );
  const longJson = await longRes.json();
  if (!longRes.ok || longJson.error) {
    throw new Error(longJson?.error?.message || "Gagal ambil long-lived token");
  }

  const expiresIn = Number(longJson.expires_in || 60 * 24 * 60 * 60);
  return {
    accessToken: longJson.access_token as string,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export type IgAccount = {
  igUserId: string;
  igUsername: string;
  pageId: string;
  pageName: string;
};

type PageNode = {
  id: string;
  name: string;
  instagram_business_account?: { id: string; username?: string };
};

function pagesToIgAccounts(pages: PageNode[]): IgAccount[] {
  return pages
    .filter((p) => p.instagram_business_account?.id)
    .map((p) => ({
      igUserId: p.instagram_business_account!.id,
      igUsername: p.instagram_business_account!.username || "",
      pageId: p.id,
      pageName: p.name,
    }));
}

export async function listIgAccounts(accessToken: string): Promise<IgAccount[]> {
  const FIELDS = "id,name,instagram_business_account{id,username}";
  const found = new Map<string, IgAccount>();

  // Jalur 1: Page klasik milik user langsung
  try {
    const me = await graphGet("/me/accounts", accessToken, {
      fields: FIELDS,
      limit: "100",
    });
    for (const acc of pagesToIgAccounts(me.data || [])) found.set(acc.pageId, acc);
  } catch (e) {
    console.log("me/accounts gagal:", e instanceof Error ? e.message : e);
  }

  // Jalur 2: Page milik Business Manager
  try {
    const biz = await graphGet("/me/businesses", accessToken, { limit: "50" });
    for (const b of biz.data || []) {
      for (const edge of ["owned_pages", "client_pages"]) {
        try {
          const pages = await graphGet(`/${b.id}/${edge}`, accessToken, {
            fields: FIELDS,
            limit: "100",
          });
          for (const acc of pagesToIgAccounts(pages.data || [])) found.set(acc.pageId, acc);
        } catch (e) {
          console.log(`${edge} gagal utk business ${b.id}:`, e instanceof Error ? e.message : e);
        }
      }
    }
  } catch (e) {
    console.log("me/businesses gagal:", e instanceof Error ? e.message : e);
  }

  return Array.from(found.values());
}

/**
 * Refresh long-lived token Meta (fb_exchange_token).
 * Dipakai cron /api/cron/instagram-refresh.
 */
export async function refreshLongLivedToken(
  currentToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: currentToken,
      }).toString(),
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || "Gagal refresh token");
  }
  const expiresIn = Number(json.expires_in || 60 * 24 * 60 * 60);
  return {
    accessToken: json.access_token as string,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}
export async function publishImage(opts: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const container = await graphGet(
    `/${opts.igUserId}/media`,
    opts.accessToken,
    {
      image_url: opts.imageUrl,
      caption: opts.caption.slice(0, 2200),
    }
  );

  for (let i = 0; i < 10; i++) {
    const st = await graphGet(`/${container.id}`, opts.accessToken, {
      fields: "status_code",
    });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("Instagram gagal memproses gambar");
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await graphPost(
    `/${opts.igUserId}/media_publish`,
    opts.accessToken,
    { creation_id: container.id }
  );
  return { mediaId: published.id };
}
export async function refreshLongLivedToken(accessToken: string) {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: accessToken,
      }).toString(),
    { cache: "no-store" }
  );
  const json = await res.json();
  console.log("[IG refreshLongLivedToken]:", JSON.stringify(json));
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Gagal refresh token: ${res.status}`);
  }
  return json;
}