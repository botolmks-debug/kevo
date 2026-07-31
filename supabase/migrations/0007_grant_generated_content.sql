-- Spec: tab "Generate Otomatis" (lanjutan 0006) — sama seperti kasus di
-- 0002, RLS policy saja tidak cukup: role `anon`/`authenticated` juga wajib
-- di-GRANT privilege dasar, kalau tidak query dari app kena
-- "permission denied for table generated_content" (Postgres code 42501).
--
-- Hanya privilege yang benar-benar dipakai kode saat ini:
-- - generated_content: select (GET riwayat) + insert (POST generate).

grant select, insert on public.generated_content to anon, authenticated;
