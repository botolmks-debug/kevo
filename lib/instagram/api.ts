// lib/instagram/api.ts
// Helper Instagram Graph API (via Facebook Login).
// Env wajib: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI

const GRAPH = "https://graph.facebook.com/v21.0";

function appId() {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID belum diisi di env");
  return v;
}
function appSecret() {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("META_APP_SECRET belum diisi di env");
  return v;
}
export function redirectUri() {
  const v = process.env.META_REDIRECT_URI;
  if (!v) throw new Error("META_REDIRECT_URI belum diisi di env");
  return v;
}

export const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "business_management",
].join(",");

export function buildAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: IG_SCOPES,
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const p = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}${path}?${p.toString()}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Graph API error ${res.status}`);
  }
  return json as T;
}

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Graph API error ${res.status}`);
  }
  return json as T;
}

export async function exchangeCodeForToken(code: string) {
  const short = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri(),
    code,
  });
  const long = await graphGet<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    {
      grant_type: "fb_exchange_token",
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: short.access_token,
    }
  );
  const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 24 * 3600) * 1000);
  return { accessToken: long.access_token, expiresAt };
}

export async function refreshLongLivedToken(token: string) {
  const long = await graphGet<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    {
      grant_type: "fb_exchange_token",
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: token,
    }
  );
  const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 24 * 3600) * 1000);
  return { accessToken: long.access_token, expiresAt };
}

export type IgPageOption = {
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername: string | null;
};

// Helper: ambil akun IG dari satu Page ID
async function igFromPageId(
  pageId: string,
  pageName: string,
  userToken: string
): Promise<IgPageOption | null> {
  try {
    const detail = await graphGet<{
      instagram_business_account?: { id: string; username?: string };
    }>(`/${pageId}`, {
      fields: "instagram_business_account{id,username}",
      access_token: userToken,
    });
    const ig = detail.instagram_business_account;
    if (ig?.id) {
      return {
        pageId,
        pageName,
        igUserId: ig.id,
        igUsername: ig.username ?? null,
      };
    }
  } catch {
    // Page tidak punya IG atau tidak bisa diakses — lewati
  }
  return null;
}

export async function listIgAccounts(userToken: string): Promise<IgPageOption[]> {
  const out: IgPageOption[] = [];
  const seen = new Set<string>();

  // --- Jalur 1: Page langsung dari akun FB (/me/accounts) ---
  try {
    const pages = await graphGet<{
      data: Array<{ id: string; name: string }>;
    }>("/me/accounts", { access_token: userToken, limit: "50" });

    for (const page of pages.data ?? []) {
      if (seen.has(page.id)) continue;
      seen.add(page.id);
      const r = await igFromPageId(page.id, page.name, userToken);
      if (r) out.push(r);
    }
  } catch {
    // /me/accounts gagal — lanjut ke jalur 2
  }

  // --- Jalur 2: Page via Business Manager (/me/businesses → owned_pages & client_pages) ---
  try {
    const businesses = await graphGet<{
      data: Array<{ id: string; name: string }>;
    }>("/me/businesses", { access_token: userToken, limit: "50" });

    for (const biz of businesses.data ?? []) {
      // owned_pages
      for (const field of ["owned_pages", "client_pages"] as const) {
        try {
          const pagesRes = await graphGet<{
            data: Array<{ id: string; name: string }>;
          }>(`/${biz.id}/${field}`, {
            fields: "id,name",
            access_token: userToken,
            limit: "50",
          });
          for (const page of pagesRes.data ?? []) {
            if (seen.has(page.id)) continue;
            seen.add(page.id);
            const r = await igFromPageId(page.id, page.name, userToken);
            if (r) out.push(r);
          }
        } catch {
          // field tidak ada atau tidak diizinkan — lewati
        }
      }
    }
  } catch {
    // /me/businesses gagal (scope tidak ada) — tidak apa-apa
  }

  return out;
}

export async function publishImage(opts: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const container = await graphPost<{ id: string }>(`/${opts.igUserId}/media`, {
    image_url: opts.imageUrl,
    caption: opts.caption.slice(0, 2200),
    access_token: opts.accessToken,
  });

  for (let i = 0; i < 10; i++) {
    const st = await graphGet<{ status_code?: string }>(`/${container.id}`, {
      fields: "status_code",
      access_token: opts.accessToken,
    });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("Instagram gagal memproses gambar");
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await graphPost<{ id: string }>(`/${opts.igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: opts.accessToken,
  });
  return { mediaId: published.id };
}
