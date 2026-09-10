import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * PEMBERSIHAN STORAGE DEMO /coba — dijalankan harian via Vercel Cron.
 * =====================================================================
 * Kenapa: tiap /coba upload 2 PNG ke bucket "demo-results" PERMANEN — ini
 * penyebab utama Storage Size & Cached Egress mendekati/lewat kuota Free Plan
 * Supabase (lihat catatan audit — Storage 91%, Cached Egress 152%).
 *
 * Kenapa RETENSI (bukan hapus langsung setelah email terkirim): email hasil
 * demo pakai <img src="URL_LIVE_SUPABASE">, BUKAN attachment — kalau file
 * dihapus segera setelah terkirim, siapa pun yang baru buka emailnya belakangan
 * (bahkan 1 jam kemudian) akan lihat gambar rusak/broken image. Retensi
 * DEMO_RETENTION_DAYS (default 7 hari) memberi waktu wajar bagi pengunjung
 * untuk membuka emailnya, sebelum file dihapus untuk hemat kuota.
 *
 * Aman dijalankan berulang: baris yang storage_cleaned_at sudah terisi
 * dilewati (tidak diproses ulang tiap hari selamanya).
 * =====================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEMO_BUCKET = "demo-results";
const RETENTION_DAYS = Number(process.env.DEMO_RETENTION_DAYS || 7);
const BATCH_SIZE = 200; // aman untuk 1x run cron, sisa lanjut run besoknya kalau ada backlog

/** Ambil "‹uuid›" dari result_url publik Supabase (…/demo-results/‹uuid›.png). */
function extractDemoId(resultUrl: string | null): string | null {
  if (!resultUrl) return null;
  const filename = resultUrl.split("/").pop();
  if (!filename) return null;
  return filename.replace(/\.png$/i, "").replace(/-bg$/i, "");
}

export async function GET(req: NextRequest) {
  // Autentikasi cron: sama persis pola demo-daily-digest yang sudah ada.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const svc = createServiceRoleClient();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await svc
      .from("demo_leads")
      .select("id, result_url, created_at")
      .is("storage_cleaned_at", null)
      .lt("created_at", cutoff)
      .limit(BATCH_SIZE);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ cleaned: 0, message: "tidak ada yang perlu dibersihkan" });
    }

    let cleaned = 0;
    let failed = 0;

    for (const row of rows as { id: string; result_url: string | null }[]) {
      const demoId = extractDemoId(row.result_url);
      if (!demoId) {
        failed++;
        continue;
      }

      // Hapus KEDUA file (final + background). remove() pada file yang sudah
      // tidak ada TIDAK melempar error fatal (Supabase Storage idempotent-safe
      // untuk kasus ini) — aman dipanggil walau salah satu sudah hilang.
      const { error: removeError } = await svc.storage
        .from(DEMO_BUCKET)
        .remove([`${demoId}.png`, `${demoId}-bg.png`]);

      if (removeError) {
        failed++;
        continue;
      }

      await svc
        .from("demo_leads")
        .update({ storage_cleaned_at: new Date().toISOString() })
        .eq("id", row.id);
      cleaned++;
    }

    return NextResponse.json({ cleaned, failed, retentionDays: RETENTION_DAYS });
  } catch (err) {
    console.error("[demo-cleanup]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
