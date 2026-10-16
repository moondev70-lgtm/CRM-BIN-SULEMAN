-- ============================================================================
-- 0004 — Round-robin assignment (concurrency-safe, assign exactly once)
-- REVIEW ONLY: written by Phase 1, NOT executed anywhere.
-- Requires 0001 (helpers) and 0002 (leads).  Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Persistent round-robin pointer (single row, locked during assignment)
-- ---------------------------------------------------------------------------
create table if not exists public.crm_assignment_state (
  id         boolean primary key default true check (id),
  next_index integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.crm_assignment_state (id, next_index)
values (true, 0)
on conflict (id) do nothing;

drop trigger if exists crm_assignment_state_touch on public.crm_assignment_state;
create trigger crm_assignment_state_touch before update on public.crm_assignment_state
  for each row execute function public.crm_touch_updated_at();

-- Lock the table down: no direct client reads/writes. Access only via the
-- SECURITY DEFINER function below (or the service role).
alter table public.crm_assignment_state enable row level security;
-- (no policies = nobody using PostgREST can touch it; service role bypasses)

-- ---------------------------------------------------------------------------
-- 2. assign_next_agent(lead_id)
--
--    * Serializes concurrent callers behind a FOR UPDATE row lock, so N
--      simultaneous webhooks can never skip or repeat an agent.
--    * Advances the pointer exactly once per successful assignment.
--    * Never re-assigns an already-assigned lead (returns current owner).
--    * Returns NULL when no eligible agent exists — caller keeps the lead
--      unassigned and the admin sees it in the "Unassigned" queue.
--    * Callable by: service role (webhooks, auth.uid() is null) and admins.
-- ---------------------------------------------------------------------------
create or replace function public.crm_assign_next_agent(p_lead_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_idx     integer;
  v_agents  uuid[];
  v_agent   uuid;
  v_current uuid;
begin
  if auth.uid() is not null and not public.crm_is_admin() then
    raise exception 'only admins can auto-assign leads';
  end if;

  select assigned_to into v_current from public.leads where id = p_lead_id;
  if not found then
    raise exception 'lead not found';
  end if;
  if v_current is not null then
    return v_current;                 -- assigned exactly once, ever
  end if;

  -- Serialize every assigner behind one row lock.
  select next_index into v_idx
    from public.crm_assignment_state
   where id = true
     for update;

  if v_idx is null then               -- defensive: row missing
    insert into public.crm_assignment_state (id, next_index)
    values (true, 0) on conflict (id) do nothing;
    select next_index into v_idx
      from public.crm_assignment_state
     where id = true
       for update;
  end if;

  -- Eligible = active + explicitly enabled for assignment.
  select array_agg(user_id order by created_at, user_id) into v_agents
    from public.crm_users
   where active and assignment_enabled;

  if v_agents is null or cardinality(v_agents) = 0 then
    return null;                      -- no eligible agents: lead stays unassigned
  end if;

  v_agent := v_agents[(v_idx % cardinality(v_agents)) + 1];

  update public.crm_assignment_state
     set next_index = v_idx + 1, updated_at = now()
   where id = true;

  update public.leads
     set assigned_to = v_agent, assignment_at = now()
   where id = p_lead_id and assigned_to is null;

  return v_agent;
end;
$$;

revoke execute on function public.crm_assign_next_agent(uuid) from public, anon;
grant execute on function public.crm_assign_next_agent(uuid)
  to authenticated, service_role;
