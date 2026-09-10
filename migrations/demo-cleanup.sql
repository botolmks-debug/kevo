-- ===== Keposting: Pembersihan storage demo /coba =====
-- Jalankan di Supabase SQL Editor (sekali).
--
-- Kenapa perlu: tiap kunjungan /coba upload 2 file PNG ke bucket "demo-results"
-- SECARA PERMANEN (tidak pernah dihapus) — ini penyebab utama Storage Size &
-- Cached Egress mendekati/lewat kuota Free Plan. File-nya tetap perlu ada
-- beberapa hari (email hasil pakai LINK gambar live, bukan attachment,
-- jadi tidak bisa dihapus langsung setelah kirim tanpa merusak gambar di email
-- yang baru dibuka belakangan) — makanya dibersihkan via cron RETENSI, bukan
-- instan. Kolom ini menandai baris yang file storage-nya SUDAH dihapus, supaya
-- cron harian tidak mengecek ulang baris yang sama tiap hari selamanya.

alter table demo_leads
  add column if not exists storage_cleaned_at timestamptz;

-- Index bantu query cron (WHERE storage_cleaned_at is null AND created_at < ...)
create index if not exists idx_demo_leads_cleanup
  on demo_leads (storage_cleaned_at, created_at)
  where storage_cleaned_at is null;
