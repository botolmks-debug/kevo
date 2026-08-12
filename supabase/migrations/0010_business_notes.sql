-- Fitur AI Check-in (tahap uji, khusus admin): catatan bisnis hasil ringkasan
-- obrolan pemilik dengan asisten. Dipakai untuk mempersonalisasi topik konten.
create table if not exists business_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists business_notes_business_created_idx
  on business_notes (business_id, created_at desc);

alter table business_notes enable row level security;

-- Pemilik hanya bisa membaca/menulis/menghapus catatannya sendiri.
create policy "business_notes_select_own" on business_notes
  for select using (auth.uid() = business_id);
create policy "business_notes_insert_own" on business_notes
  for insert with check (auth.uid() = business_id);
create policy "business_notes_delete_own" on business_notes
  for delete using (auth.uid() = business_id);
