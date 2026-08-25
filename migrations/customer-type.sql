-- Tambah kolom customer_types (array text) ke business_profile: bisa berisi
-- "b2c", "b2b", atau keduanya sekaligus (dicentang berbarengan). Dipakai AI
-- supaya tidak salah bingkai konten (mis. framing "gajian" untuk pembeli B2B
-- yang sebenarnya beli buat operasional bisnis, bukan konsumsi pribadi).
-- Default array kosong ({}) untuk baris lama yang belum pernah mengisi ini.
alter table business_profile
  add column if not exists customer_types text[] not null default '{}';
