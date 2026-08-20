-- ===== Keposting: Instagram Auto-Post =====
-- Jalankan di Supabase SQL Editor (sekali).

-- 1. Tabel koneksi Instagram per user/bisnis
create table if not exists ig_connections (
  business_id uuid primary key references auth.users (id) on delete cascade,
  ig_user_id text not null,
  ig_username text,
  page_id text not null,
  page_name text,
  access_token text not null,          -- long-lived user token (60 hari)
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ig_connections enable row level security;

-- Akses hanya lewat service role (server); tidak ada policy publik.
-- (Sengaja: token tidak boleh terbaca dari client.)

-- 2. Kolom jadwal jam + status posting di konten
alter table generated_content add column if not exists scheduled_time time;
alter table generated_content add column if not exists auto_post boolean not null default false;
alter table generated_content add column if not exists ig_posted_at timestamptz;
alter table generated_content add column if not exists ig_media_id text;
alter table generated_content add column if not exists ig_post_error text;

-- Index untuk cron scheduler
create index if not exists idx_gc_autopost
  on generated_content (auto_post, ig_posted_at, scheduled_date, scheduled_time);
