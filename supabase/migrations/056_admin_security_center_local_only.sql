-- 056: truthful Admin security readiness and atomic own-session revocation.
-- LOCAL ONLY. Apply after 055 on authorized Staging. The readiness RPC exposes
-- aggregate control evidence only; it never returns tokens, hashes or secret values.

create or replace function public.get_admin_security_readiness(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_public_table_count integer;
  v_rls_enabled_count integer;
  v_rls_missing_tables text[];
  v_admin_aal2_policy boolean;
  v_payment_proof_policy boolean;
  v_protected_storage_policy boolean;
  v_private_delivery_buckets boolean;
  v_protected_delivery_contract boolean;
  v_active_sessions integer;
  v_active_lockouts integer;
  v_failed_logins_24h integer;
  v_security_events_7d integer;
begin
  if p_actor_id is null or not public.has_permission('system.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'system_view_permission_required';
  end if;

  select count(*)::integer,
         count(*) filter (where c.relrowsecurity)::integer,
         coalesce(
           array_agg(c.relname order by c.relname) filter (where not c.relrowsecurity),
           array[]::text[]
         )
    into v_public_table_count, v_rls_enabled_count, v_rls_missing_tables
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p');

  select exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'public' and tablename = 'admin_roles'
       and policyname = 'admin roles: requires aal2' and permissive = 'RESTRICTIVE'
  ) into v_admin_aal2_policy;

  select exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'proofs own/permitted read'
  ), exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'protected-content: permitted'
  ) into v_payment_proof_policy, v_protected_storage_policy;

  select count(*) = 5 and bool_and(not b.public)
    into v_private_delivery_buckets
    from storage.buckets b
   where b.id in ('payment-proofs', 'protected-books', 'course-videos', 'course-resources', 'workshop-recordings');

  v_protected_delivery_contract := to_regclass('public.protected_delivery_events') is not null
    and to_regclass('public.protected_upload_inspections') is not null
    and to_regprocedure('public.authorize_book_download(uuid,uuid,text)') is not null
    and to_regprocedure('public.begin_video_admission(uuid,uuid,text,text)') is not null;

  select count(*)::integer into v_active_sessions
    from public.admin_sessions
   where user_id = p_actor_id and revoked_at is null
     and idle_expires_at > now() and absolute_expires_at > now();
  select count(*)::integer into v_active_lockouts
    from public.admin_login_throttles where blocked_until > now();
  select count(*)::integer into v_failed_logins_24h
    from public.admin_security_events
   where event = 'login_failed' and created_at >= now() - interval '24 hours';
  select count(*)::integer into v_security_events_7d
    from public.admin_security_events where created_at >= now() - interval '7 days';

  return jsonb_build_object(
    'public_table_count', v_public_table_count,
    'rls_enabled_count', v_rls_enabled_count,
    'rls_missing_tables', to_jsonb(v_rls_missing_tables),
    'admin_aal2_policy', v_admin_aal2_policy,
    'payment_proof_policy', v_payment_proof_policy,
    'protected_storage_policy', v_protected_storage_policy,
    'private_delivery_buckets', v_private_delivery_buckets,
    'protected_delivery_contract', v_protected_delivery_contract,
    'atomic_session_revocation', true,
    'active_sessions', v_active_sessions,
    'active_lockouts', v_active_lockouts,
    'failed_logins_24h', v_failed_logins_24h,
    'security_events_7d', v_security_events_7d,
    'checked_at', now()
  );
end $$;

revoke all on function public.get_admin_security_readiness(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_security_readiness(uuid) to service_role;
comment on function public.get_admin_security_readiness(uuid) is
  'Service-only, permission-checked aggregate security readiness. Never returns credentials, tokens, fingerprints or customer data.';

create or replace function public.manage_admin_sessions(
  p_actor_id uuid,
  p_current_session_id uuid,
  p_scope text,
  p_session_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revoked_count integer := 0;
  v_action text;
begin
  if p_actor_id is null or not public.has_permission('admin.access', p_actor_id) then
    raise exception using errcode = '42501', message = 'admin_access_permission_required';
  end if;
  if p_scope not in ('one', 'others', 'all') then
    raise exception using errcode = '22023', message = 'admin_session_scope_invalid';
  end if;
  if p_current_session_id is null or not exists (
    select 1 from public.admin_sessions
     where id = p_current_session_id and user_id = p_actor_id and revoked_at is null
       and idle_expires_at > now() and absolute_expires_at > now()
  ) then
    raise exception using errcode = '42501', message = 'active_admin_session_required';
  end if;

  if p_scope = 'one' then
    if p_session_id is null then
      raise exception using errcode = '22023', message = 'admin_session_id_required';
    end if;
    update public.admin_sessions
       set revoked_at = now()
     where id = p_session_id and user_id = p_actor_id and revoked_at is null;
    get diagnostics v_revoked_count = row_count;
    v_action := 'admin_session.revoked';
  elsif p_scope = 'others' then
    update public.admin_sessions
       set revoked_at = now()
     where user_id = p_actor_id and id <> p_current_session_id and revoked_at is null;
    get diagnostics v_revoked_count = row_count;
    v_action := 'admin_session.others_revoked';
  else
    update public.admin_sessions
       set revoked_at = now()
     where user_id = p_actor_id and revoked_at is null;
    get diagnostics v_revoked_count = row_count;
    v_action := 'admin_session.all_revoked';
  end if;

  if v_revoked_count > 0 then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (
      p_actor_id,
      v_action,
      'admin_session',
      case when p_scope = 'one' then p_session_id else p_actor_id end,
      jsonb_build_object('scope', p_scope, 'revoked_count', v_revoked_count)
    );
    insert into public.admin_security_events(actor_id, event, meta)
    values (p_actor_id, 'session_revoked', jsonb_build_object('scope', p_scope, 'revoked_count', v_revoked_count));
  end if;

  return v_revoked_count;
end $$;

revoke all on function public.manage_admin_sessions(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_admin_sessions(uuid, uuid, text, uuid) to service_role;
comment on function public.manage_admin_sessions(uuid, uuid, text, uuid) is
  'Service-only atomic revocation of an administrator own sessions with in-database permission/current-session checks and minimized audit/security events.';

-- Rollback-by-forward-fix: preserve session/security evidence; replace these RPCs
-- with a corrected forward migration rather than deleting operational history.
