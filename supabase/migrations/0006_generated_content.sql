-- Spec: tab "Generate Otomatis" — riwayat konten yang dihasilkan AI tanpa
-- template manual (jenis: produk / general / interaksi). Tabel + RLS
-- disatukan di satu file (beda dari 0001/0003 yang sempat terpisah dan
-- sempat gagal insert karena RLS auto-enable) supaya migrasi ini aman
-- dijalankan sekali jalan.
--
-- CATATAN KEAMANAN SENGAJA: sama seperti 0001/0003, RLS di sini permisif
-- (dev mode, satu workspace, belum ada auth). TODO(auth+RLS spec): ganti
-- jadi policy per business_id setelah ada auth beneran.

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,

  jenis text not null check (jenis in ('produk', 'general', 'interaksi')),
  -- referensi gambar sumber di tabel images, hanya diisi untuk jenis
  -- 'produk'. Tanpa FK, konsisten dengan images.business_id (lihat 0001).
  source_image_id uuid,

  storage_path text not null,
  on_image_text text not null default '',
  caption text not null default '',
  ratio text not null check (ratio in ('4:5', '1:1', '9:16')),
  status text not null default 'draft' check (status in ('draft', 'selesai')),

  created_at timestamptz not null default now()
);

create index if not exists generated_content_business_id_idx on generated_content (business_id);

alter table public.generated_content enable row level security;

drop policy if exists "dev: allow all on generated_content" on public.generated_content;
create policy "dev: allow all on generated_content"
  on public.generated_content
  for all
  using (true)
  with check (true);
