// POST /api/video/sinematik/tts
// body: { naskah: string, gender: "pria" | "wanita" }
// Return: { audioBase64 } (mp3) — gaya announcer iklan, tempo rapat.
import { NextResponse } from "next/server";
import { getRouteUser, isSinematikAdmin } from "@/lib/video/sinematikServer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user } = await getRouteUser();
    if (!user) return NextResponse.json({ error: "Harus login" }, { status: 401 });
    if (!isSinematikAdmin(user.email))
      return NextResponse.json({ error: "Fitur video khusus admin" }, { status: 403 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return NextResponse.json({ error: "OPENAI_API_KEY belum diisi" }, { status: 500 });

    const body = await req.json();
    const naskah = (body.naskah || "").trim();
    if (!naskah) return NextResponse.json({ error: "Naskah kosong" }, { status: 400 });

    const gender = body.gender === "wanita" ? "wanita" : "pria";
    const voice =
      gender === "wanita"
        ? process.env.TTS_VOICE_WANITA || "nova"
        : process.env.TTS_VOICE_PRIA || "onyx";

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.TTS_MODEL || "gpt-4o-mini-tts",
        voice,
        input: naskah,
        response_format: "mp3",
        instructions:
          "Bahasa Indonesia, aksen Indonesia natural. Gaya NARATOR IKLAN TV: hangat, percaya diri, energik. " +
          "Tempo CEPAT dan RAPAT tanpa jeda panjang antar kalimat — seluruh naskah selesai dalam sekitar tujuh detik. " +
          "Artikulasi tetap jelas, tidak terburu-buru kacau. Jangan tambah kata apa pun di luar naskah.",
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: `TTS gagal (${res.status}): ${t.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return NextResponse.json({ audioBase64: buf.toString("base64") });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "TTS gagal" }, { status: 500 });
  }
}
