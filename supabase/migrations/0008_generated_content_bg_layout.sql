-- 0008: kolom yang hilang di generated_content.
-- background_path : path gambar BERSIH (tanpa overlay teks/logo/footer) di storage.
--                   Dipakai editor sebagai latar supaya tidak menimpa teks 2x.
-- layout_state    : snapshot editor (template, nilai teks, override posisi, dll)
--                   supaya Edit Konten membuka konten PERSIS seperti terakhir disimpan.
-- Idempotent (add column if not exists) — aman dijalankan ulang.

alter table public.generated_content
  add column if not exists background_path text,
  add column if not exists layout_state jsonb;
