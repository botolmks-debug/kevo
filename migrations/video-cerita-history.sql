-- ===== Keposting: Video Cerita Produk masuk riwayat Edit Konten =====
-- Jalankan di Supabase SQL Editor (sekali).
--
-- Video hasil "Video Cerita Produk" (/videocerita) sekarang ikut disimpan
-- di generated_content (tabel yang sama dipakai Edit Konten) supaya
-- muncul di riwayat — TAPI beda dari gambar biasa: TIDAK bisa diedit,
-- cuma bisa diunduh + salin caption (lihat app/konten/page.tsx).
--
-- storage_path untuk baris jenis 'video_cerita' menunjuk file .mp4 (bukan
-- .png) — kolom ini sudah generic (text), tidak perlu perubahan skema.

alter table generated_content drop constraint if exists generated_content_jenis_check;
alter table generated_content
  add constraint generated_content_jenis_check
  check (jenis in ('produk', 'general', 'interaksi', 'video_cerita'));
