-- 068: privacy-minimized evidence around the external Auth password boundary.
-- LOCAL ONLY. Apply after 067 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

create table if not exists public.customer_security_operations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('password_change_current', 'password_change_recovery')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists customer_security_operations_user_created_idx
  on public.customer_security_operations(user_id, created_at desc);

alter table public.customer_security_operations enable row level security;
revoke all on table public.customer_security_operations from public, anon, authenticated;
grant select, insert, update on table public.customer_security_operations to service_role;

create or replace function public.begin_customer_password_operation(
  p_actor_id uuid,
  p_request_id uuid,
  p_kind text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_existing public.customer_security_operations%rowtype;
  v_recent_count integer;
begin
  if p_actor_id is null or p_request_id is null
     or v_kind not in ('password_change_current', 'password_change_recovery') then
    raise exception using errcode = '22023', message = 'customer_password_operation_invalid';
  end if;
  if not exists(select 1 from public.profiles where id = p_actor_id) then
    raise exception using errcode = 'P0002', message = 'customer_profile_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('customer-password:' || p_actor_id::text, 0));
  select * into v_existing
    from public.customer_security_operations
   where id = p_request_id;
  if found then
    if v_existing.user_id = p_actor_id and v_existing.kind = v_kind then
      return jsonb_build_object('outcome', 'existing', 'status', v_existing.status);
    end if;
    raise exception using errcode = '23505', message = 'customer_password_request_collision';
  end if;

  select count(*)::integer into v_recent_count
    from public.customer_security_operations
   where user_id = p_actor_id
     and created_at >= now() - interval '1 hour';
  if v_recent_count >= 5 then
    raise exception using errcode = 'P0001', message = 'customer_password_rate_limited';
  end if;

  insert into public.customer_security_operations(id, user_id, kind)
  values (p_request_id, p_actor_id, v_kind);
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'customer.password_change_started',
    'security_operation',
    p_request_id::text,
    jsonb_build_object('flow', v_kind)
  );
  return jsonb_build_object('outcome', 'started', 'status', 'pending');
end $$;

create or replace function public.finalize_customer_password_operation(
  p_actor_id uuid,
  p_request_id uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_operation public.customer_security_operations%rowtype;
begin
  if p_actor_id is null or p_request_id is null or v_status not in ('succeeded', 'failed') then
    raise exception using errcode = '22023', message = 'customer_password_finalization_invalid';
  end if;
  select * into v_operation
    from public.customer_security_operations
   where id = p_request_id and user_id = p_actor_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'customer_password_operation_not_found';
  end if;
  if v_operation.status <> 'pending' then
    if v_operation.status = v_status then
      return jsonb_build_object('outcome', 'existing', 'status', v_operation.status);
    end if;
    raise exception using errcode = '22023', message = 'customer_password_operation_finalized';
  end if;

  update public.customer_security_operations
     set status = v_status,
         completed_at = now()
   where id = v_operation.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    case when v_status = 'succeeded'
      then 'customer.password_changed'
      else 'customer.password_change_failed'
    end,
    'security_operation',
    p_request_id::text,
    jsonb_build_object('flow', v_operation.kind)
  );
  return jsonb_build_object('outcome', 'finalized', 'status', v_status);
end $$;

revoke all on function public.begin_customer_password_operation(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.finalize_customer_password_operation(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.begin_customer_password_operation(uuid,uuid,text) to service_role;
grant execute on function public.finalize_customer_password_operation(uuid,uuid,text) to service_role;

comment on table public.customer_security_operations is
  'Content-free two-phase evidence for customer password changes spanning PostgreSQL and Supabase Auth; never stores credentials, tokens, email, IP or user-agent.';
comment on function public.begin_customer_password_operation(uuid,uuid,text) is
  'Service-only, rate-limited and idempotent start evidence for a verified customer password operation.';
comment on function public.finalize_customer_password_operation(uuid,uuid,text) is
  'Service-only terminal evidence for the external Auth outcome; success and failure are explicit and immutable.';

-- Rollback-by-forward-fix: preserve immutable security evidence. Replace the
-- functions or narrow retention later; never add credential material.
