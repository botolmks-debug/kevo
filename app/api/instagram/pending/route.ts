// app/api/instagram/pending/route.ts
// Kembalikan daftar akun IG kandidat (dari cookie ig_pending) utk halaman /instagram/pilih.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRouteUser } from "@/lib/instagram/serverUser";
import { decryptPending, IG_PENDING_COOKIE } from "@/lib/instagram/pendingCookie";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jar = await cookies();
  const raw = jar.get(IG_PENDING_COOKIE)?.value;
  const pending = raw ? decryptPending(raw) : null;

  if (!pending || pending.userId !== user.id) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Token TIDAK dikirim ke client — cukup daftar akun utk dipilih
  return NextResponse.json({
    accounts: pending.accounts.map((a) => ({
      igUserId: a.igUserId,
      igUsername: a.igUsername,
      pageId: a.pageId,
      pageName: a.pageName,
    })),
  });
}
