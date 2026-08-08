-- Migration untuk Lemon Squeezy top-up
-- Run di Supabase SQL Editor

create table if not exists topup_ls_orders (
  id uuid primary key default gen_random_uuid(),
  ls_order_id text unique not null,
  business_id uuid references auth.users(id) on delete set null,
  package_id text not null,
  tokens int not null,
  amount_usd numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists topup_ls_orders_user_idx 
  on topup_ls_orders (business_id, created_at desc);

alter table topup_ls_orders enable row level security;

grant select, insert, update on public.topup_ls_orders to service_role;
