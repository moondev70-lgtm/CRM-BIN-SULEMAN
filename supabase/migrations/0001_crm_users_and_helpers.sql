-- ============================================================================
-- 0001 — CRM users, roles and shared helpers
-- Bin Suleman CRM  (dedicated CRM Supabase project — NOT the website DB)
--
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Apply manually in the CRM project's SQL editor, in numerical order.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Shared helper functions
-- ---------------------------------------------------------------------------

-- updated_at maintenance (same pattern as the public website migrations)
create or replace function public.crm_touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- True when the caller is an ACTIVE administrator.
create or replace function public.crm_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.crm_users
    where user_id = auth.uid() and role = 'admin' and active
  );
$$;

-- True when the caller has an ACTIVE account. Deactivated agents
-- immediately lose all data access even with a live session.
create or replace function public.crm_is_active()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.crm_users where user_id = auth.uid() and active
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. crm_users — one row per CRM account.
--    Email is the canonical login identifier (username alias: deferred).
-- ---------------------------------------------------------------------------
create table if not exists public.crm_users (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email              text not null unique,
  display_name       text not null default '',
  role               text not null default 'agent' check (role in ('admin','agent')),
  active             boolean not null default true,
  assignment_enabled boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deactivated_at     timestamptz
);

drop trigger if exists crm_users_touch on public.crm_users;
create trigger crm_users_touch before update on public.crm_users
  for each row execute function public.crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. First-user bootstrap (exactly one admin, decided at first insert)
--
--    Rule: if crm_users is EMPTY, the first signed-up user becomes admin;
--    every later user becomes an agent (admins promote in the Team UI).
--
--    SECURITY: disable public sign-ups in Supabase Auth settings and create
--    the first account yourself (see README), so nobody else can claim
--    the admin role.
-- ---------------------------------------------------------------------------
create or replace function public.crm_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.crm_users (user_id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name',
             split_part(coalesce(new.email, ''), '@', 1)),
    case when exists (select 1 from public.crm_users) then 'agent' else 'admin' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists crm_on_auth_user_created on auth.users;
create trigger crm_on_auth_user_created
  after insert on auth.users
  for each row execute function public.crm_handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.crm_users enable row level security;

drop policy if exists "users read own row" on public.crm_users;
create policy "users read own row" on public.crm_users
  for select using (user_id = auth.uid());

drop policy if exists "admins read all users" on public.crm_users;
create policy "admins read all users" on public.crm_users
  for select using (public.crm_is_admin());

drop policy if exists "admins insert users" on public.crm_users;
create policy "admins insert users" on public.crm_users
  for insert with check (public.crm_is_admin());

drop policy if exists "admins update users" on public.crm_users;
create policy "admins update users" on public.crm_users
  for update using (public.crm_is_admin()) with check (public.crm_is_admin());

-- No DELETE policy on purpose: deactivate instead (audit trail preserved).
-- Rows are also created by the auth trigger above (table owner, bypasses RLS)
-- and by the server-side /api/team route (service role, bypasses RLS).

-- ---------------------------------------------------------------------------
-- 5. Grants (PostgREST needs table privileges; RLS decides which rows)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.crm_users to authenticated;
grant insert, update on public.crm_users to authenticated;  -- RLS narrows to admins
-- DELETE intentionally not granted.

grant execute on function public.crm_is_admin() to anon, authenticated;
grant execute on function public.crm_is_active() to anon, authenticated;
grant execute on function public.crm_touch_updated_at() to anon, authenticated;
