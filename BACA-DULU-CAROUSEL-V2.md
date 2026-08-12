# Fitur Carousel v2 (di Generate OTOMATIS) — Cara Pasang

## Perubahan besar dari versi sebelumnya (kevo-carousel.zip)
Sesuai revisi:
- Carousel PINDAH ke tab Generate OTOMATIS (jadi jenis konten ke-5, bukan
  model di Buat Konten).
- User pilih SATU foto saja -> jadi gambar SLIDE 4 (penutup/CTA).
- Gambar slide 1-3 DIGENERATE AI (3 gambar, paralel) mengikuti alur teks
  tiap slide, satu seri visual yang mengarah ke foto user di slide 4.
- Harga tetap 4 token (sekarang isinya teks 4 slide + 3 gambar AI).

## 1. Extract ZIP ini ke root project
Extract ke `D:\Kevo project\` -> timpa (overwrite) semua.

File BARU:
- components/generate-otomatis/CarouselAuto.tsx
- lib/templates/carousel.ts            (sama dgn v1)
- lib/ai/carouselPrompt.ts             (VERSI BARU: slides + scenes x3)
- app/api/generate-carousel/route.ts   (VERSI BARU: 3 gambar paralel)
- supabase/migrations/0009_consume_tokens.sql (sama dgn v1)

File DIUBAH:
- app/generate-otomatis/AutoGenerate.tsx  (+ kartu jenis "Carousel (4 Slide)")
- lib/supabase/tokens.ts                  (sama dgn v1: +consumeTokens/refundTokens)
- lib/content/saveContent.ts              (sama dgn v1: templateId "carousel")
- app/konten/page.tsx                     (sama dgn v1: rekonstruksi Edit Konten)
- app/generate/page.tsx                   (DIKEMBALIKAN ke versi ASLI —
                                           kartu carousel di Buat Konten dihapus)

## 2. HAPUS file v1 ini (kalau sempat extract kevo-carousel.zip):
- components\generate\CarouselContent.tsx
(tidak dipakai lagi; kalau dibiarkan tidak bikin error, tapi lebih bersih dihapus)

## 3. WAJIB (kalau belum): migration di Supabase SQL Editor
Run isi `supabase/migrations/0009_consume_tokens.sql`.
Kalau sudah dijalankan waktu v1, TIDAK perlu diulang.

## 4. Restart dev server.

## Cara kerja fitur
1. Otomatis -> kartu jenis "Carousel (4 Slide)".
2. Pilih 1 foto (badge "4" = foto ini jadi slide terakhir).
3. Atur warna overlay + opacity (default 80%) — seragam di 4 slide, bisa
   diubah SETELAH generate tanpa token.
4. Generate (4 token sekali): AI menulis 4 slide (hook -> isi -> isi -> soft
   CTA sebut nama bisnis) + 3 adegan gambar yang cocok dengan teks slide 1-3
   dan mengarah ke fotomu -> 3 gambar dibuat PARALEL (total 1-2 menit).
5. Tab Slide 1-4 -> edit per slide. Slide 4 ditandai "(fotomu)".
6. "Simpan 4 PNG" -> 4 file terunduh + masuk Riwayat Otomatis (4 item,
   caption di slide 1; simpan ulang update baris yang sama). Riwayat tab
   Otomatis otomatis menampilkannya setelah refresh halaman.
7. Gagal (teks ATAU salah satu gambar) -> 4 token kembali penuh.

## Catatan teknis
- 3 gambar dijalankan Promise.all (paralel) supaya total waktu ~1 siklus
  gambar, aman dari batas maxDuration 300 detik Vercel.
- Deskripsi foto pilihanmu dikirim ke prompt teks — cerita & 3 adegan
  dibuat MENUJU foto itu, jadi slide 4 terasa sebagai puncak cerita.
- Harga token: CAROUSEL_TOKEN_COST di app/api/generate-carousel/route.ts
  (server) + components/generate-otomatis/CarouselAuto.tsx (label tombol).
- Type-check penuh (tsc --noEmit) BERSIH terhadap seluruh project.
