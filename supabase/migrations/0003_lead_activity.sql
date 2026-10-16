-- ============================================================================
-- 0003 — Lead activity: status history + notes
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Requires 0001 (helpers) and 0002 (leads).  Idempotent.
-- ============================================================================

-- Helper used by activity RLS: is the caller allowed to see this lead?
-- SECURITY DEFINER so policy evaluation never recurses into leads RLS.
create or replace function public.crm_can_see_lead(p_lead_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and ( public.crm_is_admin()
            or (l.assigned_to = auth.uid() and public.crm_is_active()) )
  );
$$;

grant execute on function public.crm_can_see_lead(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Status history (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_status_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references public.crm_users(user_id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_status_history_lead_idx
  on public.lead_status_history (lead_id, created_at desc);

alter table public.lead_status_history enable row level security;

drop policy if exists "read history of visible leads" on public.lead_status_history;
create policy "read history of visible leads" on public.lead_status_history
  for select using (public.crm_can_see_lead(lead_id));

drop policy if exists "log own status changes" on public.lead_status_history;
create policy "log own status changes" on public.lead_status_history
  for insert with check (changed_by = auth.uid() and public.crm_can_see_lead(lead_id));

grant select, insert on public.lead_status_history to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Notes (append-only; no edit/delete in Phase 1)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  author     uuid references public.crm_users(user_id) on delete set null,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx
  on public.lead_notes (lead_id, created_at desc);

alter table public.lead_notes enable row level security;

drop policy if exists "read notes of visible leads" on public.lead_notes;
create policy "read notes of visible leads" on public.lead_notes
  for select using (public.crm_can_see_lead(lead_id));

drop policy if exists "add notes to visible leads" on public.lead_notes;
create policy "add notes to visible leads" on public.lead_notes
  for insert with check (author = auth.uid() and public.crm_can_see_lead(lead_id));

grant select, insert on public.lead_notes to authenticated;
