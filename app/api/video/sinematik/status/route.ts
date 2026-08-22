// GET /api/video/sinematik/status?id=REQUEST_ID          -> { status, videoUrl?, error? }
// GET /api/video/sinematik/status?id=REQUEST_ID&dl=1     -> stream mp4 (proxy, hindari CORS di ffmpeg)
import { NextResponse } from "next/server";
import { getVeoRefStatus } from "@/lib/video/sinematik";
import { getRouteUser, isSinematikAdmin } from "@/lib/video/sinematikServer";

export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    const { user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 });

    const st = await getVeoRefStatus(id);

    if (searchParams.get("dl") === "1") {
      if (st.status !== "COMPLETED" || !st.videoUrl)
        return NextResponse.json({ error: st.error || "Video belum selesai" }, { status: 409 });
      const vr = await fetch(st.videoUrl);
      if (!vr.ok || !vr.body)
        return NextResponse.json({ error: `Gagal unduh video (${vr.status})` }, { status: 502 });
      return new Response(vr.body, {
        headers: {
          "Content-Type": "video/mp4",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(st);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal cek status" }, { status: 500 });
  }
}
