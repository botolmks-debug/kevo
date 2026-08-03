import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listAvatarsAndVoices } from "@/lib/video/heygen";
import { isAdmin } from "@/lib/supabase/tokens";

export const runtime = "nodejs";

// Buka /api/video/options di browser (saat login) untuk menemukan avatar_id &
// voice_id, lalu isi HEYGEN_AVATAR_ID & HEYGEN_VOICE_ID di .env.local.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: "Fitur video khusus admin." }, { status: 403 });
  }

  const res = await listAvatarsAndVoices();
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  const pick = (o: Record<string, unknown>, keys: string[]): unknown => {
    for (const k of keys) if (o[k] !== undefined) return o[k];
    return undefined;
  };

  const avatars = res.avatars.slice(0, 60).map((a) => ({
    avatar_id: pick(a, ["avatar_id", "id"]),
    name: pick(a, ["avatar_name", "name"]),
    gender: pick(a, ["gender"]),
    preview: pick(a, ["preview_image_url", "preview_url"]),
  }));

  const voices = res.voices.map((v) => ({
    voice_id: pick(v, ["voice_id", "id"]),
    name: pick(v, ["name", "display_name"]),
    language: pick(v, ["language"]),
    gender: pick(v, ["gender"]),
  }));
  const voicesIndonesia = voices.filter((v) => /indonesia|bahasa/i.test(String(v.language ?? "")));

  return NextResponse.json({
    petunjuk:
      "Salin salah satu avatar_id ke HEYGEN_AVATAR_ID dan satu voice_id (utamakan dari voicesIndonesia) ke HEYGEN_VOICE_ID di .env.local, lalu restart dev.",
    avatars,
    voicesIndonesia,
    voicesAllCount: voices.length,
  });
}
