-- Spec-08: fondasi database — business_profile, images, bucket Storage.
--
-- CATATAN KEAMANAN SENGAJA (baca sebelum menjalankan):
-- - RLS TIDAK diaktifkan di tabel manapun di sini. Belum ada auth (mode trial,
--   satu workspace dev) — auth beneran + RLS multi-tenant adalah irisan
--   terpisah yang perlu review ekstra ketat (lihat CLAUDE.md).
-- - Bucket Storage dibuat PUBLIC supaya gambar bisa ditampilkan lewat
--   getPublicUrl() tanpa signed URL (lebih sederhana untuk fase trial).
-- - Policy storage.objects di bawah sengaja permisif (insert/select bebas)
--   untuk bucket ini saja — akan diperketat bareng spec auth+RLS nanti.
-- Semua ini cocok untuk data dummy/dev, JANGAN dipakai apa adanya untuk data
-- pelanggan asli sebelum spec auth+RLS selesai.

create extension if not exists pgcrypto;

-- =========================================================================
-- business_profile — satu baris per bisnis. business_id adalah primary key
-- (bukan kolom `id` terpisah) karena untuk sekarang cuma ada 1 nilai dev
-- tetap; ini juga yang bikin "upsert on conflict business_id" jadi natural.
-- =========================================================================
create table if not exists business_profile (
  business_id uuid primary key,

  -- identitas
  business_name text not null default '',
  industry text not null default '',
  business_age text not null default '',
  location text not null default '',

  -- produk/pelanggan
  main_products text not null default '',
  flagship_product text not null default '',
  price_range text not null default '',
  target_customer text not null default '',
  customer_problem text not null default '',

  -- pesan/positioning
  differentiator text not null default '',
  content_goals text[] not null default '{}',
  tone text not null default '',
  cta text not null default '',
  avoid text not null default '',

  -- cerita usaha
  story text not null default '',

  -- sosial media: daftar lengkap {platformId, value} + yang dipilih tampil
  social_entries jsonb not null default '[]',
  selected_social_platform_ids text[] not null default '{}',

  -- referensi logo di Storage (nullable — belum ada alur isi di spec ini)
  logo_storage_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- images — database gambar per bisnis.
-- `category` teks bebas (daftar pilihan tetap dijaga di kode, lihat
-- lib/images/categories.ts) — sesuai spec, tidak perlu tabel categories
-- terpisah. `type` adalah slug turunan dari kategori, dipakai AI nanti untuk
-- pencocokan program-friendly.
-- =========================================================================
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,

  storage_path text not null,
  description text not null default '',
  category text not null,
  type text not null check (type in ('logo', 'produk', 'wajah', 'suasana', 'lain')),
  usage text not null default 'apa_adanya' check (usage in ('apa_adanya', 'olah_ai')),

  created_at timestamptz not null default now()
);

create index if not exists images_business_id_idx on images (business_id);
create index if not exists images_category_idx on images (category);

-- =========================================================================
-- Storage bucket untuk file gambar.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('user-images', 'user-images', true)
on conflict (id) do nothing;

-- Dev-mode: bebas upload/baca cuma untuk bucket 'user-images'.
-- TODO(auth+RLS spec): ganti jadi policy per business_id setelah ada auth.
-- drop+create supaya migration ini aman dijalankan ulang (idempotent).
drop policy if exists "dev: allow all on user-images" on storage.objects;
create policy "dev: allow all on user-images"
  on storage.objects
  for all
  using (bucket_id = 'user-images')
  with check (bucket_id = 'user-images');
