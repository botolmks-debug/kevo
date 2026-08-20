// app/api/instagram/select/route.ts
// Terima pilihan akun (igUserId) dari halaman /instagram/pilih, simpan koneksi, hapus cookie.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertConnection } from "@/lib/supabase/igConnections";
import { getRouteUser } from "@/lib/instagram/serverUser";
import { decryptPending, IG_PENDING_COOKIE } from "@/lib/instagram/pendingCookie";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let igUserId = "";
  try {
    const body = await req.json();
    igUserId = String(body?.igUserId || "");
  } catch {
    /* body invalid */
  }
  if (!igUserId) {
    return NextResponse.json({ error: "igUserId wajib" }, { status: 400 });
  }

  const jar = await cookies();
  const raw = jar.get(IG_PENDING_COOKIE)?.value;
  const pending = raw ? decryptPending(raw) : null;

  if (!pending || pending.userId !== user.id) {
    return NextResponse.json(
      { error: "Sesi pemilihan kedaluwarsa. Ulangi hubungkan Instagram." },
      { status: 410 }
    );
  }

  const acc = pending.accounts.find((a) => a.igUserId === igUserId);
  if (!acc) {
    return NextResponse.json({ error: "Akun tidak ditemukan di daftar" }, { status: 400 });
  }

  await upsertConnection({
    business_id: user.id,
    ig_user_id: acc.igUserId,
    ig_username: acc.igUsername,
    page_id: acc.pageId,
    page_name: acc.pageName,
    access_token: pending.accessToken,
    token_expires_at: pending.expiresAt,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(IG_PENDING_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
