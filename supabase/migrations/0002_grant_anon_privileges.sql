-- Spec-08 (lanjutan): 0001 membuat tabel tapi belum memberi privilege ke role
-- `anon`/`authenticated` — makanya query dari app (pakai anon key) kena
-- "permission denied for table ..." (Postgres code 42501). RLS memang sengaja
-- tidak diaktifkan (lihat komentar di 0001), tapi privilege GRANT dasar tetap
-- wajib ada supaya role anon boleh menyentuh tabelnya sama sekali.
--
-- Hanya privilege yang benar-benar dipakai kode saat ini:
-- - business_profile: select+insert+update (dipakai oleh upsert).
-- - images: select+insert (belum ada update/delete di app).

grant select, insert, update on public.business_profile to anon, authenticated;
grant select, insert on public.images to anon, authenticated;
