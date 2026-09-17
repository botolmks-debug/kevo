-- Jalankan di Supabase SQL Editor sebelum deploy fitur generate logo

alter table business_profile
  add column if not exists logo_free_generate_used boolean not null default false;
