// lib/ai/momenKalender.ts (v2)
// Kalender momen Indonesia — dipakai DUA tempat dari satu sumber data:
//   1. buildMomenBlock(date)  -> blok prompt AI (angle kontekstual saat generate)
//   2. momenForDate(date)     -> penanda event di kalender halaman Jadwal
//
// Cara pakai di route generate (app/api/generate-auto/route.ts):
//   import { buildMomenBlock } from "@/lib/ai/momenKalender";
//   const momenBlock = buildMomenBlock(new Date());
//
// Prioritas kalau ada beberapa momen sekaligus:
//   momen tanggal-tetap > tanggal kembar (bulan.bulan) > masa gajian > akhir pekan.

export type MomenInfo = { label: string; angle: string; emoji: string };

type MomenTetap = {
  bulan: number; // 1-12
  tanggal: number;
  label: string;
  emoji: string;
  lead: number; // mulai disebut di prompt berapa hari sebelum hari-H
  angle: string;
};

// Momen tanggal tetap (berulang tiap tahun).
const MOMEN_TETAP: MomenTetap[] = [
  { bulan: 1, tanggal: 1, label: "Tahun Baru", emoji: "\u{1F386}", lead: 5, angle: "resolusi, awal baru, target tahun ini" },
  { bulan: 2, tanggal: 14, label: "Hari Valentine", emoji: "\u{1F495}", lead: 4, angle: "kasih sayang, hadiah, perhatian untuk orang terdekat" },
  { bulan: 4, tanggal: 21, label: "Hari Kartini", emoji: "\u{1F469}", lead: 3, angle: "perempuan berdaya, pelanggan/pelaku usaha perempuan" },
  { bulan: 5, tanggal: 1, label: "Hari Buruh", emoji: "\u{1F6E0}\uFE0F", lead: 2, angle: "apresiasi kerja keras, istirahat, self-reward" },
  { bulan: 5, tanggal: 2, label: "Hari Pendidikan Nasional", emoji: "\u{1F4DA}", lead: 2, angle: "belajar, edukasi, berbagi ilmu" },
  { bulan: 7, tanggal: 23, label: "Hari Anak Nasional", emoji: "\u{1F9D2}", lead: 3, angle: "keluarga, anak, momen bersama" },
  { bulan: 8, tanggal: 12, label: "Hari UMKM Nasional", emoji: "\u{1F3EA}", lead: 4, angle: "bangga jadi UMKM, dukung usaha lokal, cerita perjuangan usaha" },
  { bulan: 8, tanggal: 17, label: "HUT Kemerdekaan RI", emoji: "\u{1F1EE}\u{1F1E9}", lead: 7, angle: "semangat merdeka, nuansa merah putih, kebanggaan lokal" },
  { bulan: 9, tanggal: 4, label: "Hari Pelanggan Nasional", emoji: "\u{1F91D}", lead: 3, angle: "terima kasih ke pelanggan, apresiasi, testimoni" },
  { bulan: 10, tanggal: 1, label: "Hari Kopi Internasional", emoji: "\u2615", lead: 2, angle: "ngopi, jeda santai, ritme kerja" },
  { bulan: 10, tanggal: 2, label: "Hari Batik Nasional", emoji: "\u{1F458}", lead: 2, angle: "budaya lokal, kebanggaan produk Indonesia" },
  { bulan: 10, tanggal: 28, label: "Hari Sumpah Pemuda", emoji: "\u270A", lead: 3, angle: "semangat anak muda, kolaborasi, gerak bareng" },
  { bulan: 11, tanggal: 10, label: "Hari Pahlawan", emoji: "\u{1F396}\uFE0F", lead: 3, angle: "penghormatan, kerja keras tanpa sorotan, pahlawan keseharian" },
  { bulan: 11, tanggal: 25, label: "Hari Guru Nasional", emoji: "\u{1F34E}", lead: 3, angle: "terima kasih guru, belajar dari pengalaman" },
  { bulan: 12, tanggal: 22, label: "Hari Ibu", emoji: "\u{1F490}", lead: 4, angle: "terima kasih ibu, sosok di balik layar" },
  { bulan: 12, tanggal: 25, label: "Hari Natal", emoji: "\u{1F384}", lead: 5, angle: "kehangatan, kebersamaan, berbagi" },
  { bulan: 12, tanggal: 31, label: "Malam Tahun Baru", emoji: "\u{1F387}", lead: 3, angle: "kilas balik setahun, ucapan terima kasih, harapan" },
];

// Momen tanggal berubah tiap tahun (hijriah/lunar). PERKIRAAN — mohon
// cek ulang & perbarui daftar ini setahun sekali (angka bisa geser 1-2 hari).
type MomenSekaliJalan = {
  tahun: number;
  bulan: number;
  tanggal: number;
  label: string;
  emoji: string;
  lead: number;
  angle: string;
};

const MOMEN_TAHUNAN: MomenSekaliJalan[] = [
  { tahun: 2026, bulan: 12, tanggal: 12, label: "Harbolnas 12.12", emoji: "\u{1F6CD}\uFE0F", lead: 5, angle: "promo akhir tahun, belanja online, penawaran spesial" },
  { tahun: 2027, bulan: 2, tanggal: 6, label: "Tahun Baru Imlek", emoji: "\u{1F9E7}", lead: 5, angle: "keberuntungan, warna merah-emas, kebersamaan keluarga" },
  { tahun: 2027, bulan: 2, tanggal: 8, label: "Awal Ramadan (perkiraan)", emoji: "\u{1F319}", lead: 7, angle: "persiapan Ramadan, menu sahur-berbuka, ibadah & keberkahan" },
  { tahun: 2027, bulan: 3, tanggal: 9, label: "Idul Fitri (perkiraan)", emoji: "\u{1F54C}", lead: 10, angle: "Lebaran, mudik, hampers, maaf-maafan, silaturahmi" },
];

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Momen pada TANGGAL PERSIS itu (untuk penanda kalender Jadwal).
 * Berbeda dari buildMomenBlock yang punya jendela "lead" beberapa hari
 * sebelum hari-H — kalender hanya menandai hari-H-nya.
 * Masa gajian & akhir pekan sengaja TIDAK ditandai di kalender
 * (terlalu sering, bikin ramai) — keduanya tetap dipakai di prompt AI.
 */
export function momenForDate(d: Date): MomenInfo | null {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  for (const t of MOMEN_TAHUNAN) {
    if (t.tahun === y && t.bulan === m && t.tanggal === day) {
      return { label: t.label, angle: t.angle, emoji: t.emoji };
    }
  }
  for (const t of MOMEN_TETAP) {
    if (t.bulan === m && t.tanggal === day) {
      return { label: t.label, angle: t.angle, emoji: t.emoji };
    }
  }
  // Tanggal kembar (9.9, 10.10, 11.11, 12.12) — momen belanja online.
  // 12.12 sudah tercakup Harbolnas di daftar tahunan utk 2026.
  if (m >= 8 && m <= 12 && day === m) {
    return {
      label: `Tanggal Kembar ${m}.${m}`,
      angle: "momen belanja online, penawaran terbatas, cek keranjang",
      emoji: "\u{1F6D2}",
    };
  }
  return null;
}

function selisihHariKeDepan(dari: Date, bulan: number, tanggal: number, tahunTarget?: number): number {
  const base = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  let target = new Date(tahunTarget ?? dari.getFullYear(), bulan - 1, tanggal);
  if (tahunTarget == null && target < base) {
    target = new Date(dari.getFullYear() + 1, bulan - 1, tanggal);
  }
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

function labelJarak(hari: number): string {
  if (hari === 0) return "HARI INI";
  if (hari === 1) return "BESOK";
  return `${hari} hari lagi`;
}

export function buildMomenBlock(now: Date = new Date()): string {
  // 1) Momen tahunan tanggal-berubah (Ramadan, Lebaran, Imlek, Harbolnas)
  for (const m of MOMEN_TAHUNAN) {
    const d = selisihHariKeDepan(now, m.bulan, m.tanggal, m.tahun);
    if (d >= 0 && d <= m.lead) {
      return blok(`${m.label} (${labelJarak(d)})`, m.angle);
    }
  }

  // 2) Momen tanggal tetap
  let terdekat: { label: string; angle: string; jarak: number } | null = null;
  for (const m of MOMEN_TETAP) {
    const d = selisihHariKeDepan(now, m.bulan, m.tanggal);
    if (d >= 0 && d <= m.lead && (!terdekat || d < terdekat.jarak)) {
      terdekat = { label: m.label, angle: m.angle, jarak: d };
    }
  }
  if (terdekat) {
    return blok(`${terdekat.label} (${labelJarak(terdekat.jarak)})`, terdekat.angle);
  }

  // 3) Tanggal kembar bulan ini (9.9, 10.10, dst) — momen belanja online
  const bulanIni = now.getMonth() + 1;
  if (bulanIni >= 8 && bulanIni <= 12) {
    const d = selisihHariKeDepan(now, bulanIni, bulanIni);
    if (d >= 0 && d <= 3) {
      return blok(
        `Tanggal kembar ${bulanIni}.${bulanIni} (${labelJarak(d)})`,
        "momen belanja online, penawaran terbatas, cek keranjang"
      );
    }
  }

  // 4) Masa gajian (25 s/d akhir bulan + tanggal 1-2)
  const tgl = now.getDate();
  if (tgl >= 25 || tgl <= 2) {
    return blok(
      "Masa gajian",
      "self-reward setelah kerja keras, atur budget, saatnya beli yang sudah lama diincar"
    );
  }

  // 5) Akhir pekan
  const hari = now.getDay();
  if (hari === 5 || hari === 6 || hari === 0) {
    return blok(
      `Akhir pekan (${NAMA_HARI[hari]})`,
      "santai, waktu keluarga, jeda dari rutinitas, persiapan minggu depan"
    );
  }

  return ""; // hari biasa: tanpa blok momen, prompt berjalan normal
}

function blok(momen: string, angle: string): string {
  return [
    "",
    "=== MOMEN SAAT INI ===",
    `Momen: ${momen}.`,
    `Angle yang bisa dipakai: ${angle}.`,
    "ATURAN: kaitkan konten dengan momen ini HANYA jika terasa natural untuk bisnis ini — jangan dipaksakan. Kalau dipakai, momen jadi bumbu (hook/konteks), bukan mengubah topik utama jadi melenceng dari usaha.",
  ].join("\n");
}
