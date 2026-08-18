import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * BUKTI SOSIAL — ambil beberapa gambar hasil demo /coba terbaru.
 * Dipakai di halaman /signup untuk mematahkan keraguan "hasilnya zonk nggak?"
 * dengan menampilkan hasil NYATA dari pengguna lain.
 *
 * PRIVASI: hanya mengembalikan URL gambar (result_url). TIDAK mengembalikan
 * email, caption, IP, atau data pribadi apa pun dari demo_leads.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("demo_leads")
      .select("result_url")
      .not("result_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ images: [] });
    }

    const images = (data || [])
      .map((r) => r.result_url)
      .filter((u): u is string => typeof u === "string" && u.length > 0)
      .slice(0, 6);

    return NextResponse.json(
      { images },
      {
        // cache 10 menit di CDN — bukti tak perlu real-time, hemat query
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
      }
    );
  } catch {
    return NextResponse.json({ images: [] });
  }
}
