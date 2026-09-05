/**
 * POST /api/video/cerita/save — simpan video hasil "Video Cerita Produk"
 * (mp4, sudah jadi di browser lewat ffmpeg.wasm) ke generated_content,
 * supaya muncul di riwayat Edit Konten. TIDAK memotong token (biaya sudah
 * dibayar di step storyboard/TTS) — ini cuma penyimpanan.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/tokens";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { insertVideoGeneratedContent } from "@/lib/supabase/generatedContent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role belum terhubung: env SUPABASE_SERVICE_ROLE_KEY belum diisi." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: "Fitur Video Cerita khusus admin (sementara)." }, { status: 403 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body harus multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("video");
  const title = formData.get("title");
  const caption = formData.get("caption");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File video wajib diisi." }, { status: 400 });
  }
  if (typeof caption !== "string" || !caption.trim()) {
    return NextResponse.json({ error: "Caption wajib diisi." }, { status: 400 });
  }

  const videoBuffer = Buffer.from(await file.arrayBuffer());
  const service = createServiceRoleClient();

  const result = await insertVideoGeneratedContent(
    supabase,
    {
      businessId: user.id,
      videoBuffer,
      title: typeof title === "string" ? title.slice(0, 200) : "",
      caption,
      ratio: "9:16",
    },
    service,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, id: result.row.id });
}
