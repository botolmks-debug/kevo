-- Tabel pengaturan global aplikasi (key-value)
create table if not exists app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
-- Hanya service_role yang bisa baca/tulis (proxy & API admin)
grant all on app_settings to service_role;

-- Seed: maintenance OFF secara default
insert into app_settings (key, value) values ('maintenance_mode', 'false')
on conflict (key) do nothing;
