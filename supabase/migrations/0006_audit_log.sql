-- ============================================================================
-- 0006 — Audit log (append-only change trail)
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Requires 0001 (helpers) and 0002 (leads).  Idempotent.
-- ============================================================================

create table if not exists public.crm_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references public.crm_users(user_id) on delete set null,
  actor_email text,
  action      text not null,          -- e.g. 'lead_updated', 'user_invited'
  entity_type text not null,          -- e.g. 'lead', 'user'
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists crm_audit_log_entity_idx
  on public.crm_audit_log (entity_type, entity_id, created_at desc);
create index if not exists crm_audit_log_actor_idx
  on public.crm_audit_log (actor, created_at desc);

alter table public.crm_audit_log enable row level security;

drop policy if exists "admins read audit log" on public.crm_audit_log;
create policy "admins read audit log" on public.crm_audit_log
  for select using (public.crm_is_admin());

drop policy if exists "users log own actions" on public.crm_audit_log;
create policy "users log own actions" on public.crm_audit_log
  for insert with check (actor = auth.uid());

grant select, insert on public.crm_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Automatic change trail on every meaningful lead update.
-- SECURITY DEFINER: runs with table-owner rights so the trail cannot be
-- bypassed by any client (agent or admin) and never fails the update.
-- ---------------------------------------------------------------------------
create or replace function public.crm_leads_audit() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.crm_audit_log
    (actor, actor_email, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    (select email from public.crm_users where user_id = auth.uid()),
    'lead_updated',
    'lead',
    old.id::text,
    jsonb_build_object(
      'status', old.status,
      'assigned_to', old.assigned_to,
      'follow_up_at', old.follow_up_at,
      'do_not_contact', old.do_not_contact
    ),
    jsonb_build_object(
      'status', new.status,
      'assigned_to', new.assigned_to,
      'follow_up_at', new.follow_up_at,
      'do_not_contact', new.do_not_contact
    )
  );
  return new;
end;
$$;

drop trigger if exists leads_audit on public.leads;
create trigger leads_audit
  after update on public.leads
  for each row
  when (
    old.status           is distinct from new.status
    or old.assigned_to   is distinct from new.assigned_to
    or old.follow_up_at  is distinct from new.follow_up_at
  )
  execute function public.crm_leads_audit();

revoke execute on function public.crm_leads_audit() from public, anon, authenticated;
