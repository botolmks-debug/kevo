/**
 * GET /api/video/seedance/status?id=<requestId>        -> status JSON
 * GET /api/video/seedance/status?id=<requestId>&dl=1   -> stream mp4 (kalau selesai)
 * ADMIN ONLY. Sama seperti jalur Veo: beta, video dialirkan langsung tanpa
 * disimpan ke storage — kalau nanti dibuka utk user, tambahkan upload bucket.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { getSeedanceStatus, downloadSeedanceVideo } from "@/lib/video/seedance";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  // request_id fal = UUID — validasi longgar tapi cukup menolak input aneh.
  if (!id || !/^[a-zA-Z0-9-]{10,64}$/.test(id)) {
    return NextResponse.json({ error: "Parameter id tidak valid." }, { status: 400 });
  }

  try {
    const status = await getSeedanceStatus(id);
    if (!status.done) return NextResponse.json({ done: false });
    if ("error" in status) return NextResponse.json({ done: true, error: status.error });

    if (url.searchParams.get("dl") === "1") {
      const bytes = await downloadSeedanceVideo(status.videoUrl);
      return new Response(bytes, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="keposting-seedance-${Date.now()}.mp4"`,
        },
      });
    }
    return NextResponse.json({ done: true, ready: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal cek status." },
      { status: 500 },
    );
  }
}
