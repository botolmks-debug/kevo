-- Bagian "logo bisnis tetap": tambah posisi pojok logo (dipakai untuk
-- menimpa layout.logo {x,y} per template/rasio saat render). logo_storage_path
-- sudah ada sejak 0001, kolom ini melengkapi supaya logo bisa otomatis
-- dipasang di tiap konten yang digenerate.

alter table business_profile
  add column if not exists logo_position text not null default 'top-left'
    check (logo_position in ('top-left', 'top-right', 'bottom-left', 'bottom-right'));
