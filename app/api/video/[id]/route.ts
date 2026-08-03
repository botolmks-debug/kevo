import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getVideoJob, updateVideoJob } from "@/lib/supabase/videoJobs";
import { isAdmin } from "@/lib/supabase/tokens";
import { getVideoStatus } from "@/lib/video/heygen";
import { publicImageUrl } from "@/lib/supabase/images";

export const runtime = "nodejs";
export const maxDuration = 120;

// Video disimpan di bucket yang sama dengan gambar (sudah public) — tanpa setup bucket baru.
const BUCKET = "user-images";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const service = createServiceRoleClient();
  const jobRes = await getVideoJob(service, id, user.id);
  if (!jobRes.ok) return NextResponse.json({ error: jobRes.error }, { status: 502 });
  const job = jobRes.row;
  if (!job) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });

  // Sudah pernah selesai → langsung kembalikan URL yang tersimpan.
  if (job.status === "completed" && job.video_path) {
    return NextResponse.json({ status: "completed", videoUrl: publicImageUrl(service, job.video_path) });
  }
  if (job.status === "failed") {
    return NextResponse.json({ status: "failed", error: job.error ?? "Video gagal dibuat." });
  }
  if (!job.heygen_video_id) {
    return NextResponse.json({ status: "processing" });
  }

  // Tanya status ke HeyGen.
  const st = await getVideoStatus(job.heygen_video_id);
  if (!st.ok) return NextResponse.json({ error: st.error }, { status: 502 });

  if (st.status === "processing") {
    return NextResponse.json({ status: "processing" });
  }
  if (st.status === "failed") {
    await updateVideoJob(service, job.id, { status: "failed", error: st.error ?? "HeyGen gagal." });
    return NextResponse.json({ status: "failed", error: st.error ?? "HeyGen gagal." });
  }

  // completed tapi URL belum ada → minta klien poll lagi.
  if (!st.videoUrl) {
    return NextResponse.json({ status: "processing" });
  }

  // Download mp4 dari HeyGen (URL sementara) lalu simpan ke Supabase.
  let mp4: ArrayBuffer;
  try {
    const r = await fetch(st.videoUrl);
    if (!r.ok) throw new Error(String(r.status));
    mp4 = await r.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Gagal mengunduh video dari HeyGen." }, { status: 502 });
  }

  const path = `${job.business_id}/video/${job.id}.mp4`;
  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, Buffer.from(mp4), { contentType: "video/mp4", upsert: true });
  if (upErr) {
    return NextResponse.json({ error: "Gagal menyimpan video: " + upErr.message }, { status: 502 });
  }

  await updateVideoJob(service, job.id, { status: "completed", video_path: path });
  return NextResponse.json({ status: "completed", videoUrl: publicImageUrl(service, path) });
}
