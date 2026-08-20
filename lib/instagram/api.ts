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

// Scope minimum untuk publish + baca akun IG dari Page
export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "pages_show_list",
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

// --- OAuth: code -> short token -> long-lived token (60 hari) ---
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

// Perpanjang long-lived token (dipanggil cron sebelum kadaluarsa)
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

// --- Ambil Page + akun IG Business yang tertaut ---
export type IgPageOption = {
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername: string | null;
};

export async function listIgAccounts(userToken: string): Promise<IgPageOption[]> {
  const pages = await graphGet<{
    data: Array<{ id: string; name: string; access_token: string }>;
  }>("/me/accounts", { access_token: userToken, limit: "50" });

  const out: IgPageOption[] = [];
  for (const page of pages.data ?? []) {
    try {
      const detail = await graphGet<{
        instagram_business_account?: { id: string; username?: string };
      }>(`/${page.id}`, {
        fields: "instagram_business_account{id,username}",
        access_token: userToken,
      });
      const ig = detail.instagram_business_account;
      if (ig?.id) {
        out.push({
          pageId: page.id,
          pageName: page.name,
          igUserId: ig.id,
          igUsername: ig.username ?? null,
        });
      }
    } catch {
      // Page tanpa IG tertaut — lewati
    }
  }
  return out;
}

// --- Publish 1 gambar: create container -> publish ---
export async function publishImage(opts: {
  igUserId: string;
  accessToken: string;
  imageUrl: string; // harus JPEG, URL publik
  caption: string;
}) {
  const container = await graphPost<{ id: string }>(`/${opts.igUserId}/media`, {
    image_url: opts.imageUrl,
    caption: opts.caption.slice(0, 2200),
    access_token: opts.accessToken,
  });

  // Tunggu container siap (IG memproses gambar dulu)
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
