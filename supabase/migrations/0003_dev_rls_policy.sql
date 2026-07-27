-- Spec-08 (lanjutan lagi): ternyata project Supabase ini mengaktifkan RLS
-- otomatis untuk tabel baru di schema public (di luar kendali 0001), dan
-- tanpa policy, defaultnya "tolak semua" -> "new row violates row-level
-- security policy". Karena belum ada auth (mode trial, satu workspace dev),
-- pasang policy permisif sementara di kedua tabel, sama semangatnya dengan
-- policy storage.objects di 0001.
--
-- TODO(auth+RLS spec): ganti policy ini jadi per-business_id setelah ada auth
-- beneran — jangan biarkan permisif ini di production nanti.

alter table public.business_profile enable row level security;

drop policy if exists "dev: allow all on business_profile" on public.business_profile;
create policy "dev: allow all on business_profile"
  on public.business_profile
  for all
  using (true)
  with check (true);

alter table public.images enable row level security;

drop policy if exists "dev: allow all on images" on public.images;
create policy "dev: allow all on images"
  on public.images
  for all
  using (true)
  with check (true);
