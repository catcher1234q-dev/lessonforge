-- LessonForge Supabase bootstrap
-- Run this in the Supabase SQL editor after auth is enabled.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_name text not null check (plan_name in ('starter', 'basic', 'pro')),
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seller_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text,
  store_name text not null,
  store_handle text not null unique,
  primary_subject text,
  tagline text,
  seller_plan_key text not null default 'starter' check (seller_plan_key in ('starter', 'basic', 'pro')),
  onboarding_completed boolean not null default false,
  stripe_account_id text unique,
  stripe_onboarding_status text,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id text primary key,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  price integer not null default 0,
  file_url text,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id text primary key,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'paid',
  amount_paid integer not null default 0,
  seller_share_paid integer not null default 0,
  platform_share_paid integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.library_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  granted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, product_id)
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null,
  user_id uuid references public.profiles (id) on delete set null,
  product_id text references public.products (id) on delete set null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.system_settings (
  id text primary key,
  maintenance_mode_enabled boolean not null default false,
  maintenance_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_logs (
  id text primary key,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists seller_profiles_store_handle_idx on public.seller_profiles(store_handle);
create index if not exists products_seller_id_idx on public.products(seller_id);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_product_id_idx on public.orders(product_id);
create unique index if not exists orders_buyer_id_product_id_idx on public.orders(buyer_id, product_id);
create index if not exists library_access_product_id_idx on public.library_access(product_id);
create index if not exists stripe_webhook_events_product_id_idx on public.stripe_webhook_events(product_id);
create index if not exists admin_audit_logs_actor_user_id_idx on public.admin_audit_logs(actor_user_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.library_access enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.system_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin_user());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
on public.subscriptions
for select
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "seller_profiles_select_own_or_admin" on public.seller_profiles;
create policy "seller_profiles_select_own_or_admin"
on public.seller_profiles
for select
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "seller_profiles_insert_own_or_admin" on public.seller_profiles;
create policy "seller_profiles_insert_own_or_admin"
on public.seller_profiles
for insert
with check (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "seller_profiles_update_own_or_admin" on public.seller_profiles;
create policy "seller_profiles_update_own_or_admin"
on public.seller_profiles
for update
using (auth.uid() = user_id or public.is_admin_user())
with check (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "subscriptions_insert_admin_only" on public.subscriptions;
create policy "subscriptions_insert_admin_only"
on public.subscriptions
for insert
with check (public.is_admin_user());

drop policy if exists "subscriptions_update_admin_only" on public.subscriptions;
create policy "subscriptions_update_admin_only"
on public.subscriptions
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "products_select_owner_or_admin" on public.products;
create policy "products_select_owner_or_admin"
on public.products
for select
using (auth.uid() = seller_id or public.is_admin_user());

drop policy if exists "products_modify_owner_or_admin" on public.products;
create policy "products_modify_owner_or_admin"
on public.products
for all
using (auth.uid() = seller_id or public.is_admin_user())
with check (auth.uid() = seller_id or public.is_admin_user());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders
for select
using (auth.uid() = buyer_id or public.is_admin_user());

drop policy if exists "orders_insert_admin_only" on public.orders;
create policy "orders_insert_admin_only"
on public.orders
for insert
with check (public.is_admin_user());

drop policy if exists "orders_update_admin_only" on public.orders;
create policy "orders_update_admin_only"
on public.orders
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "library_access_select_own_or_admin" on public.library_access;
create policy "library_access_select_own_or_admin"
on public.library_access
for select
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "library_access_modify_admin_only" on public.library_access;
create policy "library_access_modify_admin_only"
on public.library_access
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "stripe_webhook_events_admin_only" on public.stripe_webhook_events;
create policy "stripe_webhook_events_admin_only"
on public.stripe_webhook_events
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "system_settings_admin_only" on public.system_settings;
create policy "system_settings_admin_only"
on public.system_settings
for all
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "admin_audit_logs_admin_only" on public.admin_audit_logs;
create policy "admin_audit_logs_admin_only"
on public.admin_audit_logs
for all
using (public.is_admin_user())
with check (public.is_admin_user());
