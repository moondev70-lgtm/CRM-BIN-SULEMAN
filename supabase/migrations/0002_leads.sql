-- ============================================================================
-- 0002 — Leads
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Requires 0001 (crm_users, crm_touch_updated_at, crm_is_admin/active).
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  -- Meta leadgen_id. UNIQUE = duplicate webhook deliveries can never
  -- create a second lead row (dedupe protection).
  external_id       text unique,
  source            text not null default 'manual'
                    check (source in ('facebook_form','click_to_whatsapp','manual')),
  name              text,
  phone             text,                       -- exactly as submitted
  phone_e164        text,                       -- normalized E.164 when parseable
  email             text,
  form_answers      jsonb not null default '{}'::jsonb,
  fb_page_id        text,
  fb_page_name      text,
  fb_form_id        text,
  fb_form_name      text,
  fb_campaign_id    text,
  fb_ad_id          text,
  -- Lead creation timestamp as reported by Meta (may differ from received_at)
  meta_created_time timestamptz,
  received_at       timestamptz not null default now(),
  assigned_to       uuid references public.crm_users(user_id) on delete set null,
  assignment_at     timestamptz,
  status            text not null default 'new'
                    check (status in ('new','contacted','follow_up','qualified',
                                      'appointment','won','lost','unqualified')),
  follow_up_at      date,
  consent_whatsapp  boolean not null default false,
  do_not_contact    boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists leads_assigned_to_idx
  on public.leads (assigned_to, created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_follow_up_idx
  on public.leads (follow_up_at) where follow_up_at is not null;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.crm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Agent write-scope guard.
-- Signed-in non-admins (agents) may only change status + follow_up_at.
-- Everything else raises an error. The service role (auth.uid() is null,
-- used by the future webhook worker) is not restricted by this guard —
-- it is already trusted server-side.
-- ---------------------------------------------------------------------------
create or replace function public.crm_leads_guard() returns trigger
language plpgsql as $$
begin
  if public.crm_is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.assigned_to      is distinct from old.assigned_to
     or new.external_id   is distinct from old.external_id
     or new.source        is distinct from old.source
     or new.name          is distinct from old.name
     or new.phone         is distinct from old.phone
     or new.phone_e164    is distinct from old.phone_e164
     or new.email         is distinct from old.email
     or new.form_answers  is distinct from old.form_answers
     or new.consent_whatsapp is distinct from old.consent_whatsapp
     or new.do_not_contact    is distinct from old.do_not_contact then
    raise exception 'agents may only update status and follow-up date';
  end if;
  return new;
end;
$$;

drop trigger if exists leads_guard on public.leads;
create trigger leads_guard before update on public.leads
  for each row execute function public.crm_leads_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;

drop policy if exists "admins read all leads" on public.leads;
create policy "admins read all leads" on public.leads
  for select using (public.crm_is_admin());

drop policy if exists "agents read assigned leads" on public.leads;
create policy "agents read assigned leads" on public.leads
  for select using (assigned_to = auth.uid() and public.crm_is_active());

drop policy if exists "admins insert leads" on public.leads;
create policy "admins insert leads" on public.leads
  for insert with check (public.crm_is_admin());
-- (Webhook ingestion uses the service role, which bypasses RLS entirely.)

drop policy if exists "admins update leads" on public.leads;
create policy "admins update leads" on public.leads
  for update using (public.crm_is_admin()) with check (public.crm_is_admin());

drop policy if exists "agents update assigned leads" on public.leads;
create policy "agents update assigned leads" on public.leads
  for update using (assigned_to = auth.uid() and public.crm_is_active())
  with check (assigned_to = auth.uid() and public.crm_is_active());

drop policy if exists "admins delete leads" on public.leads;
create policy "admins delete leads" on public.leads
  for delete using (public.crm_is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.leads to authenticated;
-- RLS narrows rows/columns; agents are additionally limited by leads_guard.

grant execute on function public.crm_leads_guard() to postgres;
revoke execute on function public.crm_leads_guard() from public, anon, authenticated;
