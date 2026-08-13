-- 0012_achievements.sql (v2 — GANTIKAN versi sebelumnya; aman dijalankan ulang)
-- Sistem achievement/streak Keposting.
-- activity_days: 1 baris per bisnis per hari aktif (ada minimal 1 aksi AI).
-- business_achievements: peringkat tercapai + token yang sudah dihadiahkan.
-- grant_achievement: RPC atomik & idempoten — insert peringkat + tambah token
--   HANYA kalau peringkat itu belum pernah tercatat (anti hadiah dobel).

create table if not exists activity_days (
  business_id uuid not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (business_id, day)
);

alter table activity_days enable row level security;

drop policy if exists "activity_days: baca milik sendiri" on activity_days;
create policy "activity_days: baca milik sendiri"
  on activity_days for select
  using (business_id = auth.uid());

-- Insert dari route (client user) — hanya untuk dirinya sendiri.
drop policy if exists "activity_days: catat milik sendiri" on activity_days;
create policy "activity_days: catat milik sendiri"
  on activity_days for insert
  with check (business_id = auth.uid());

grant select, insert on activity_days to authenticated;
grant all on activity_days to service_role;

create table if not exists business_achievements (
  business_id uuid not null,
  tier text not null,
  tokens_granted int not null default 0,
  achieved_at timestamptz not null default now(),
  primary key (business_id, tier)
);

alter table business_achievements enable row level security;

drop policy if exists "achievements: baca milik sendiri" on business_achievements;
create policy "achievements: baca milik sendiri"
  on business_achievements for select
  using (business_id = auth.uid());

grant select on business_achievements to authenticated;
grant all on business_achievements to service_role;

-- Hadiah peringkat: security definer supaya bisa insert achievement + update
-- tokens tanpa bergantung RLS/klien service-role. Idempoten via on conflict.
create or replace function grant_achievement(
  p_business_id uuid,
  p_tier text,
  p_tokens int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean := false;
begin
  -- Hanya boleh untuk dirinya sendiri (dipanggil dari route ber-auth).
  if auth.uid() is distinct from p_business_id then
    return false;
  end if;

  insert into business_achievements (business_id, tier, tokens_granted)
  values (p_business_id, p_tier, greatest(0, p_tokens))
  on conflict (business_id, tier) do nothing;

  inserted := found;

  if inserted and p_tokens > 0 then
    update business_profile
      set tokens = coalesce(tokens, 0) + p_tokens
      where business_id = p_business_id;
  end if;

  return inserted;
end;
$$;

grant execute on function grant_achievement(uuid, text, int) to authenticated;

notify pgrst, 'reload schema';
