-- Spec-08 (lanjutan): fitur hapus gambar pakai SUPABASE_SERVICE_ROLE_KEY
-- (sengaja bypass RLS). Tapi bypass RLS itu beda lapis dari GRANT tabel di
-- Postgres — role `service_role` tetap butuh privilege dasar, sama seperti
-- `anon` di 0002. Tanpa ini: "permission denied for table images" (42501).
--
-- service_role dikasih privilege penuh (termasuk delete) karena memang
-- tujuannya operasi administratif/privileged dari server.

grant select, insert, update, delete on public.business_profile to service_role;
grant select, insert, update, delete on public.images to service_role;
