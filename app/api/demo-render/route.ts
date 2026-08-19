import { NextResponse } from "next/server";

/**
 * DEMO-RENDER — dinonaktifkan (sharp tidak tersedia di Vercel).
 * Judul sekarang ditampilkan via CSS di browser (/coba/page.tsx),
 * bukan di-burn ke gambar. Endpoint ini tidak lagi dipanggil karena
 * coba/page.tsx sudah skip demo-render saat demoId ada.
 * Dijaga sebagai stub supaya tidak ada 404 kalau ada request lama.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Kembalikan ok: false supaya caller (coba/page.tsx) tahu dan skip gracefully.
  return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
}
