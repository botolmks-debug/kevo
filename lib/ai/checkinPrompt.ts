/**
 * AI Check-in (tahap uji, khusus admin): asisten menyapa pemilik usaha,
 * MENDENGARKAN seperti manusia, lalu diam-diam meringkas info yang berguna
 * jadi catatan bisnis netral untuk mempersonalisasi konten berikutnya.
 *
 * Satu panggilan JSON menghasilkan dua hal sekaligus:
 * - reply: balasan hangat ala teman ngobrol (bukan robot formal)
 * - note : ringkasan netral yang layak simpan, atau null kalau tidak ada
 *          info berguna / isinya sensitif
 */
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export type CheckinTurn = { role: "user" | "assistant"; text: string };

export function buildCheckinPrompt(
  profile: BusinessProfile,
  history: CheckinTurn[],
  message: string,
): string {
  const historyBlock = history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "PEMILIK" : "ASISTEN"}: ${t.text}`)
    .join("\n");

  return `Kamu adalah asisten pribadi yang akrab dengan pemilik usaha ini. Gayamu seperti TEMAN yang tulus mendengarkan cerita — hangat, santai, bahasa sehari-hari Indonesia, boleh sesekali emoji. BUKAN customer service formal, BUKAN motivator berlebihan.

Profil usaha (untuk konteks, jangan diceramahkan balik ke pemilik):
- Nama usaha: ${profile.business.name || "-"}
- Industri: ${profile.business.industry || "-"}
- Produk utama: ${profile.offering.mainProducts || "-"}
- Target pelanggan: ${profile.offering.targetCustomer || "-"}

${historyBlock ? `Obrolan sebelumnya:\n${historyBlock}\n` : ""}
PEMILIK baru saja bilang: "${message}"

TUGAS 1 — reply (balasan ke pemilik):
- Tanggapi ISI ceritanya secara spesifik (sebut hal yang dia ceritakan), seperti manusia yang benar-benar menyimak.
- 1-3 kalimat pendek. Kalau ceritanya seru/penting, boleh tanya SATU pertanyaan lanjutan yang natural (jangan lebih dari satu, jangan interogasi).
- Ikut senang kalau kabarnya baik, berempati kalau lagi susah — tanpa berlebihan dan tanpa menggurui.
- JANGAN menawarkan fitur, JANGAN menyebut soal "data disimpan", JANGAN promosi.

TUGAS 2 — note (catatan diam-diam untuk sistem konten):
- Ringkas info yang BERGUNA untuk membuat konten sosmed usaha ini ke depannya: produk/varian baru, stok, tren yang dia lihat, kebiasaan pelanggan, rencana, hal yang dia suka/tidak suka soal usahanya, momen musiman.
- Tulis netral, singkat (maks 25 kata), pihak ketiga. Contoh: "Sedang menyiapkan varian botol 500ml warna pastel, target rilis bulan depan."
- WAJIB null kalau: tidak ada info berguna (basa-basi, salam), ATAU isinya sensitif — keluhan/gosip tentang orang atau pihak tertentu, nama orang/kompetitor/karyawan, masalah pribadi/keluarga/kesehatan/keuangan pribadi, konflik. JANGAN pernah menulis nama orang atau nama pihak lain di note.
- Note adalah RINGKASAN untuk inspirasi topik, bukan transkrip.

Balas HANYA JSON valid, tanpa fence markdown, persis:
{"reply":"...","note":"..." atau null}`;
}

/** Format catatan tersimpan jadi blok prompt untuk generate konten. */
export function notesPromptBlock(notes: { note: string; created_at: string }[]): string {
  if (!notes.length) return "";
  const list = notes
    .map((n) => {
      const d = new Date(n.created_at);
      const tgl = isNaN(d.getTime()) ? "" : ` (${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })})`;
      return `- ${n.note}${tgl}`;
    })
    .join("\n");
  return `\n\nKABAR TERBARU DARI PEMILIK USAHA (hasil obrolan langsung — pakai sebagai inspirasi topik supaya konten terasa hidup dan relevan dengan kondisi usahanya sekarang; boleh dipakai salah satu, boleh juga tidak kalau tidak nyambung dengan arahan di atas. JANGAN menyebut nama orang/pihak lain, JANGAN membahas hal sensitif, JANGAN menulis seolah mengutip pemilik):\n${list}`;
}
