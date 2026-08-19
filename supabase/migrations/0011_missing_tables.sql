-- 0011: Tabel & kolom yang dipakai kode tapi belum ada file migrasinya.
-- Jalankan juga di SQL Editor setelah file ini dibuat di repo.
-- Idempotent — aman dijalankan ulang.

-- generated_content: scheduled_date (dipakai enforceContentCap & jadwal)
alter table public.generated_content
  add column if not exists scheduled_date date;

-- business_profile: kolom refill token harian
alter table public.business_profile
  add column if not exists last_free_refill_at timestamptz;

-- error_logs
create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  route text,
  provider text,
  error_message text,
  error_stack text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table error_logs enable row level security;
grant all on error_logs to service_role;

-- token_usage
create table if not exists token_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  action text,
  created_at timestamptz not null default now()
);
alter table token_usage enable row level security;
grant all on token_usage to service_role;
grant insert on token_usage to authenticated;

-- support_conversations
create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_email text,
  role text not null,
  message text not null,
  session_id text,
  created_at timestamptz not null default now()
);
alter table support_conversations enable row level security;
grant all on support_conversations to service_role;

-- topup_orders (Midtrans)
create table if not exists topup_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  business_id uuid not null,
  package_id text,
  tokens int,
  gross_amount int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table topup_orders enable row level security;
drop policy if exists "topup_orders: baca milik sendiri" on topup_orders;
create policy "topup_orders: baca milik sendiri"
  on topup_orders for select using (business_id = auth.uid());
grant all on topup_orders to service_role;
grant select on topup_orders to authenticated;

-- topup_ls_orders (LemonSqueezy)
create table if not exists topup_ls_orders (
  id uuid primary key default gen_random_uuid(),
  ls_order_id text unique,
  business_id uuid,
  tokens int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table topup_ls_orders enable row level security;
grant all on topup_ls_orders to service_role;

-- video_jobs
create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  source_content_id uuid,
  heygen_video_id text,
  status text not null default 'processing',
  script text,
  avatar_id text,
  voice_id text,
  ratio text,
  result_url text,
  created_at timestamptz not null default now()
);
alter table video_jobs enable row level security;
drop policy if exists "video_jobs: baca milik sendiri" on video_jobs;
create policy "video_jobs: baca milik sendiri"
  on video_jobs for select using (business_id = auth.uid());
grant all on video_jobs to service_role;
grant select on video_jobs to authenticated;

-- demo_leads
create table if not exists demo_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  business_type text,
  image_url text,
  result_url text,
  caption text,
  converted boolean default false,
  ip text,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists demo_leads_email_key
  on demo_leads (lower(email));
create index if not exists demo_leads_created_at_idx
  on demo_leads (created_at desc);
alter table demo_leads enable row level security;
grant all on demo_leads to service_role;

notify pgrst, 'reload schema';
