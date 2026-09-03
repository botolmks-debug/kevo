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
    "- Kalau mayoritas memakai emoji pembuka yang SAMA PERSIS (mis. selalu 🎉 di awal), ganti JENIS/POSISI emoji-nya biar tidak monoton — TAPI ini BUKAN alasan untuk berhenti pakai emoji sama sekali. Aturan dasar caption (emoji tetap wajib disisipkan sesuai instruksi EMOJI di atas) TETAP BERLAKU terlepas dari daftar riwayat ini — yang perlu bervariasi cuma jenis/posisi emoji-nya, bukan ada-tidaknya.",
    "- Cari sudut pandang, ritme kalimat, dan pilihan kata yang terasa SEGAR dibanding semua contoh di atas.",
  ].join("\n");
}

/**
 * Judul (onImageText) dari N post "Konten Berita" terakhir milik bisnis ini
 * — dipakai buat kunci pencarian berita SUPAYA TIDAK ambil topik yang sama
 * berulang (kejadian nyata: 3x generate berturut-turut semua soal "Google
 * Pics"). Beda dari getRecentCaptions di atas: cuma jenis="berita" (topik
 * post lain seperti Produk/General tidak relevan buat deteksi topik berita
 * yang berulang), dan pakai onImageText (judul) bukan caption penuh — judul
 * sudah wajib menyebut subjek konkret (lihat lib/ai/newsPrompt.ts), jadi
 * lebih ringkas & akurat buat identifikasi topik dibanding caption panjang.
 */
export async function getRecentNewsTitles(
  supabase: SupabaseClient,
  businessId: string,
  limit: number = 8,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("generated_content")
      .select("on_image_text")
      .eq("business_id", businessId)
      .eq("jenis", "berita")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data
      .map((row) => (row as { on_image_text?: string | null }).on_image_text)
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return [];
  }
}
