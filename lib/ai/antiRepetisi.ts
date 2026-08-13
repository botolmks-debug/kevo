// lib/ai/antiRepetisi.ts
// Anti-repetisi caption: ambil N caption terakhir milik bisnis ini,
// lalu bangun blok prompt yang MELARANG AI memakai pola yang sama.
//
// Cara pakai (di app/api/generate-auto/route.ts, setelah auth & profile):
//   import { getRecentCaptions, buildAntiRepetisiBlock } from "@/lib/ai/antiRepetisi";
//   const recent = await getRecentCaptions(supabase, user.id);
//   const antiRepetisi = buildAntiRepetisiBlock(recent);
//   // lalu tempelkan `antiRepetisi` ke prompt caption (lihat instruksi wiring).

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CAPTIONS = 12; // cukup untuk deteksi pola, tidak membengkakkan prompt
const MAX_CHARS_PER_CAPTION = 200; // potong caption panjang, pola sudah kelihatan dari awal

export async function getRecentCaptions(
  supabase: SupabaseClient,
  businessId: string,
  limit: number = MAX_CAPTIONS
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("generated_content")
      .select("caption")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data
      .map((row) => (row as { caption?: unknown }).caption)
      .filter(
        (c): c is string => typeof c === "string" && c.trim().length > 0
      );
  } catch {
    // Anti-repetisi bersifat best-effort: kalau query gagal,
    // generate tetap jalan tanpa blok ini.
    return [];
  }
}

export function buildAntiRepetisiBlock(captions: string[]): string {
  if (!captions.length) return "";

  const daftar = captions
    .slice(0, MAX_CAPTIONS)
    .map((c, i) => {
      const ringkas = c.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS_PER_CAPTION);
      return `${i + 1}. ${ringkas}`;
    })
    .join("\n");

  return [
    "",
    "=== ANTI-REPETISI (ATURAN KERAS) ===",
    "Caption yang SUDAH PERNAH dipakai bisnis ini (jangan diulang polanya):",
    daftar,
    "ATURAN:",
    "- DILARANG memakai kalimat pembuka, pola hook, struktur paragraf, frasa khas, atau gaya CTA yang mirip dengan daftar di atas.",
    "- Kalau mayoritas daftar di atas dibuka dengan PERTANYAAN, caption baru JANGAN dibuka dengan pertanyaan.",
    "- Kalau mayoritas memakai kata seru atau emoji pembuka yang sama, pilih pembuka yang berbeda total.",
    "- Cari sudut pandang, ritme kalimat, dan pilihan kata yang terasa SEGAR dibanding semua contoh di atas.",
  ].join("\n");
}
