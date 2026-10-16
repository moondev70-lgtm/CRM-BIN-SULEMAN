-- ============================================================================
-- 0005 — Integration tables: webhook events, Sheets sync queue, config
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Requires 0001 (helpers) and 0002 (leads).  Idempotent.
--
-- These tables back the FUTURE Meta webhook worker (Phase 2) and the
-- Google Sheets synchronisation queue (Phase 3). They are created now so
-- the schema is complete and reviewable; no code writes to them in
-- Phase 1 (service role only).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Webhook events (dedupe + replay protection for Meta leadgen events)
-- ---------------------------------------------------------------------------
create table if not exists public.crm_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  -- One row per external event. 'meta:' || leadgen_id for Facebook.
  event_key    text not null unique,
  source       text not null default 'meta_leadgen',
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'received'
               check (status in ('received','processing','processed','failed')),
  lead_id      uuid references public.leads(id) on delete set null,
  error        text,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists crm_webhook_events_status_idx
  on public.crm_webhook_events (status, received_at desc);

alter table public.crm_webhook_events enable row level security;

drop policy if exists "admins read webhook events" on public.crm_webhook_events;
create policy "admins read webhook events" on public.crm_webhook_events
  for select using (public.crm_is_admin());

-- No insert/update policies: ingest + processing run through the service
-- role only (server routes). Admins get read-only visibility.
grant select on public.crm_webhook_events to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Google Sheets sync queue (database-backed, CRM is source of truth)
--
--    UNIQUE (lead_id, destination) means a retried job UPDATES the pending
--    row instead of duplicating it — retry-safe by construction.
-- ---------------------------------------------------------------------------
create table if not exists public.crm_sync_queue (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  -- 'master' or 'sheet:' || agent user_id
  destination     text not null,
  operation       text not null default 'upsert'
                  check (operation in ('upsert','delete')),
  status          text not null default 'pending'
                  check (status in ('pending','processing','succeeded','failed')),
  attempt_count   integer not null default 0,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  last_success_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (lead_id, destination)
);

create index if not exists crm_sync_queue_due_idx
  on public.crm_sync_queue (status, next_attempt_at);

drop trigger if exists crm_sync_queue_touch on public.crm_sync_queue;
create trigger crm_sync_queue_touch before update on public.crm_sync_queue
  for each row execute function public.crm_touch_updated_at();

alter table public.crm_sync_queue enable row level security;

drop policy if exists "admins read sync queue" on public.crm_sync_queue;
create policy "admins read sync queue" on public.crm_sync_queue
  for select using (public.crm_is_admin());

grant select on public.crm_sync_queue to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Integration config (NON-SECRET, admin-editable key/value settings)
--    e.g. WhatsApp template text, master spreadsheet id, feature flags.
--    Secrets (tokens, keys) NEVER go here — they live in Vercel env vars.
-- ---------------------------------------------------------------------------
create table if not exists public.crm_integration_config (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text not null default '',
  updated_by  uuid references public.crm_users(user_id) on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists crm_integration_config_touch on public.crm_integration_config;
create trigger crm_integration_config_touch before update on public.crm_integration_config
  for each row execute function public.crm_touch_updated_at();

alter table public.crm_integration_config enable row level security;

drop policy if exists "admins read config" on public.crm_integration_config;
create policy "admins read config" on public.crm_integration_config
  for select using (public.crm_is_admin());

drop policy if exists "admins write config" on public.crm_integration_config;
create policy "admins write config" on public.crm_integration_config
  for insert with check (public.crm_is_admin());

drop policy if exists "admins update config" on public.crm_integration_config;
create policy "admins update config" on public.crm_integration_config
  for update using (public.crm_is_admin()) with check (public.crm_is_admin());

drop policy if exists "admins delete config" on public.crm_integration_config;
create policy "admins delete config" on public.crm_integration_config
  for delete using (public.crm_is_admin());

grant select, insert, update, delete on public.crm_integration_config to authenticated;
