-- 039: administrative MFA assurance telemetry. Application enforcement is performed
-- at proxy, server-action, and restrictive-RLS layers in the same release.
create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event text not null check (event in ('login_succeeded','login_failed','mfa_enrolled','mfa_verified','session_revoked','reauth_required')),
  request_fingerprint text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.admin_security_events is 'Privacy-minimized administrative authentication/security events; never stores tokens, IP addresses, or user-agent strings.';
create index if not exists admin_security_events_actor_created_idx on public.admin_security_events(actor_id, created_at desc);
create index if not exists admin_security_events_event_created_idx on public.admin_security_events(event, created_at desc);
alter table public.admin_security_events enable row level security;
create policy "admin security events: audit readers" on public.admin_security_events for select using (public.has_permission('audit.view'));

-- Restrictive policies compose with every existing permissive policy. They prevent any
-- enrolled administrator from using an AAL1 session against administration data.
alter table public.admin_roles enable row level security;
drop policy if exists "admin roles: enrolled mfa requires aal2" on public.admin_roles;
create policy "admin roles: enrolled mfa requires aal2" on public.admin_roles as restrictive to authenticated
using (
  not exists (select 1 from auth.mfa_factors factor where factor.user_id = auth.uid() and factor.status = 'verified')
  or (select auth.jwt()->>'aal') = 'aal2'
);

-- Rollback guidance: drop the restrictive policy and table only after disabling application AAL2 checks.
