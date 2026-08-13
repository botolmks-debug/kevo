/**
 * GET /api/video/veo/status?op=<operationName>          -> status JSON
 * GET /api/video/veo/status?op=<operationName>&dl=1     -> stream mp4 (kalau selesai)
 * ADMIN ONLY. Catatan beta: video dialirkan langsung (tidak disimpan ke
 * storage) — cukup untuk uji admin; kalau nanti dibuka utk user, tambahkan
 * upload ke bucket seperti alur HeyGen.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { getVeoStatus, downloadVeoVideo } from "@/lib/video/veo";

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
  const op = url.searchParams.get("op");
  if (!op || !op.startsWith("models/")) {
    return NextResponse.json({ error: "Parameter op tidak valid." }, { status: 400 });
  }

  try {
    const status = await getVeoStatus(op);
    if (!status.done) return NextResponse.json({ done: false });
    if ("error" in status) return NextResponse.json({ done: true, error: status.error });

    if (url.searchParams.get("dl") === "1") {
      const bytes = await downloadVeoVideo(status.videoUri);
      return new Response(bytes, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="keposting-veo-${Date.now()}.mp4"`,
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
