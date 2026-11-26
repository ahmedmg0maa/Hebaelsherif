-- Owner-authorized password entry. No role is granted by this migration.
-- Explicit service-only enrollment, verified password AMR, and a live session
-- bound to the Supabase session_id are all required. Staff retain AAL2.
create table public.owner_password_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.owner_password_access enable row level security;
revoke all on public.owner_password_access from public,anon,authenticated;
grant select,insert,update,delete on public.owner_password_access to service_role;
alter table public.admin_sessions add column auth_session_id uuid;
alter table public.admin_sessions add column password_verified_at timestamptz;
create index admin_sessions_auth_session_idx on public.admin_sessions(user_id,auth_session_id);

create function public.owner_password_assured(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(uid=auth.uid() and auth.role()='authenticated'
 and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a where a->>'method'='password')
 and exists(select 1 from public.owner_password_access o join public.admin_roles r on r.user_id=o.user_id and r.role='owner' where o.user_id=uid and o.enabled)
 and exists(select 1 from public.admin_sessions s where s.user_id=uid
   and s.auth_session_id::text=auth.jwt()->>'session_id' and s.password_verified_at is not null
   and s.revoked_at is null and s.idle_expires_at>now() and s.absolute_expires_at>now()),false)
$$;
revoke all on function public.owner_password_assured(uuid) from public,anon;
grant execute on function public.owner_password_assured(uuid) to authenticated,service_role;

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.role()='service_role' or (uid=auth.uid() and
   (auth.jwt()->>'aal'='aal2' or public.owner_password_assured(uid))))
 and exists(select 1 from public.admin_roles where user_id=uid),false)
$$;
create or replace function public.has_role(role_name text,uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_admin(uid) and exists(select 1 from public.admin_roles where user_id=uid and role=role_name)
$$;
create or replace function public.has_permission(permission_name text,uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_admin(uid) and exists(select 1 from public.admin_roles r where r.user_id=uid
 and (r.role='owner' or exists(select 1 from public.admin_permissions p where p.role=r.role and p.permission=permission_name)))
$$;
drop policy if exists "admin roles: requires aal2" on public.admin_roles;
create policy "admin roles: verified assurance" on public.admin_roles as restrictive to authenticated
using (coalesce(auth.jwt()->>'aal'='aal2',false) or public.owner_password_assured(auth.uid()));
-- Enrollment is done once by scripts/setup-owner.mjs, never by a public endpoint.

create function public.enroll_password_owner(p_user uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('owner-bootstrap',0));
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'user missing';end if;
 if exists(select 1 from public.admin_roles where role='owner') and not exists(select 1 from public.admin_roles where role='owner' and user_id=p_user) then raise exception 'existing owner required';end if;
 if not exists(select 1 from public.admin_roles where user_id=p_user and role='owner') then insert into public.admin_roles(user_id,role) values(p_user,'owner');end if;
 insert into public.owner_password_access(user_id) values(p_user) on conflict(user_id) do update set enabled=true;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_user,'owner.password_entry_enabled','admin',p_user::text,'{}');
 return true;
end $$;
revoke all on function public.enroll_password_owner(uuid) from public,anon,authenticated;
grant execute on function public.enroll_password_owner(uuid) to service_role;

-- Account-wide, atomic pre-auth attempt count; independent of caller IP/User-Agent.
create table public.admin_account_attempts (
 key_hash text primary key check(key_hash ~ '^[0-9a-f]{64}$'),
 window_start timestamptz not null default now(), attempts integer not null default 1
);
alter table public.admin_account_attempts enable row level security;
revoke all on public.admin_account_attempts from public,anon,authenticated,service_role;
create function public.consume_admin_account_attempt(p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.role() <> 'service_role' or p_key !~ '^[0-9a-f]{64}$' then return false; end if;
 insert into public.admin_account_attempts(key_hash) values(p_key)
 on conflict(key_hash) do update set
 attempts=case when admin_account_attempts.window_start < now()-interval '15 minutes' then 1 else least(21,admin_account_attempts.attempts+1) end,
 window_start=case when admin_account_attempts.window_start < now()-interval '15 minutes' then now() else admin_account_attempts.window_start end
 returning attempts into n;
 return n<=20;
end $$;
revoke all on function public.consume_admin_account_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_admin_account_attempt(text) to service_role;

-- Readiness reflects the authorized owner exception rather than reporting obsolete AAL2-only policy.
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
       and policyname = 'admin roles: verified assurance' and permissive = 'RESTRICTIVE'
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
    'admin_assurance_policy', v_admin_aal2_policy,
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
