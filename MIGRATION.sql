-- Refill system: tambah kolom + backfill user existing
-- Run di Supabase SQL Editor

-- 1. Kolom untuk track kapan terakhir refill
alter table business_profile
  add column if not exists last_free_refill_at timestamptz;

-- 2. Backfill: semua user existing yang tokens < 5, di-set ke 5
--    (biar mereka bisa mulai testing rapi tanpa harus tunggu 5 hari refill)
--    Kita set last_free_refill_at = now() supaya refill baru terjadi 24 jam lagi
update business_profile
set 
  tokens = 5,
  last_free_refill_at = now()
where coalesce(tokens, 0) < 5;

-- Info: unlimited users (mis. botolmakassar) juga kena backfill di sini,
-- tapi tidak apa-apa karena mereka di-skip di app level (UNLIMITED_EMAILS check).
-- Kolom tokens mereka tidak akan pernah dipakai untuk logic.
