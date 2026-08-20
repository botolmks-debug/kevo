// app/api/cron/instagram-post/route.ts
// Dipanggil Vercel Cron (lihat vercel.json). Posting semua konten yang:
// auto_post = true, belum terposting, dan jadwalnya (tanggal+jam WIB) sudah lewat.
// Aman dipanggil berulang: baris yang sudah punya ig_posted_at dilewati.
import { NextResponse } from "next/server";
import { createIgServiceClient, getConnection } from "@/lib/supabase/igConnections";
import { publishContentToIg } from "@/lib/instagram/publishContent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TZ_OFFSET_MS = 7 * 3600 * 1000; // WIB (UTC+7). Jadwal disimpan sbg waktu lokal WIB.

function nowWib() {
  return new Date(Date.now() + TZ_OFFSET_MS);
}

export async function GET(req: Request) {
  // Proteksi: hanya Vercel Cron (header Authorization: Bearer CRON_SECRET)
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createIgServiceClient();
  const now = nowWib();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD (WIB)
  const clock = now.toISOString().slice(11, 19); // HH:MM:SS (WIB)

  // Ambil kandidat: terjadwal hari ini (jam <= sekarang) ATAU tanggal sudah lewat
  const { data: rows, error } = await db
    .from("generated_content")
    .select("id,business_id,scheduled_date,scheduled_time")
    .eq("auto_post", true)
    .is("ig_posted_at", null)
    .not("scheduled_date", "is", null)
    .lte("scheduled_date", today)
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (rows ?? []).filter((r) => {
    if (r.scheduled_date < today) return true;
    const t = (r.scheduled_time as string | null) ?? "09:00:00"; // default pagi
    return t <= clock;
  });

  const results: Array<{ id: string; ok: boolean; msg: string }> = [];
  for (const row of due) {
    try {
      const conn = await getConnection(row.business_id as string);
      if (!conn) {
        results.push({ id: row.id, ok: false, msg: "IG tidak terhubung" });
        continue;
      }
      const r = await publishContentToIg(row.id, conn);
      results.push({
        id: row.id,
        ok: true,
        msg: r.skipped ? r.reason : `posted ${r.mediaId}`,
      });
    } catch (e) {
      results.push({
        id: row.id,
        ok: false,
        msg: e instanceof Error ? e.message : "gagal",
      });
    }
  }

  return NextResponse.json({ checked: rows?.length ?? 0, posted: results });
}
