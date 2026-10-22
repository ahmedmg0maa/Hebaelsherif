-- 080: close legacy function grants, make security history append-only, and
-- introduce privacy-minimized administrative login-history fields.
-- LOCAL ONLY. Apply after 079 on authorized Staging, then verify before Production.

create or replace function public.is_enrolled(course uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    uid is not null
    and (
      uid = auth.uid()
      or auth.role() = 'service_role'
      or public.has_permission('learning.manage', auth.uid())
    )
    and exists (
      select 1 from public.course_enrollments enrollment
       where enrollment.course_id = course and enrollment.user_id = uid
    )
  );
$$;
revoke all on function public.is_enrolled(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_enrolled(uuid, uuid) to authenticated, service_role;
comment on function public.is_enrolled(uuid,uuid) is
  'Enrollment check limited to the current user, service role, or an AAL2 learning manager.';

revoke all on function public.expire_stale_orders() from public, anon, authenticated;
grant execute on function public.expire_stale_orders() to service_role;
comment on function public.expire_stale_orders() is
  'Scheduler/server-only expiry; browser roles cannot trigger order and booking transitions.';

drop policy if exists "audit_logs: admin insert" on public.audit_logs;
drop policy if exists "audit_logs: permitted insert" on public.audit_logs;
revoke insert, update, delete, truncate on table public.audit_logs from anon, authenticated;
comment on table public.audit_logs is
  'Append-only business audit history. Only governed security-definer transactions or service processes may append; browser roles can never alter history.';

alter table public.admin_security_events
  drop constraint if exists admin_security_events_event_check;
alter table public.admin_security_events
  add column if not exists subject_hash text,
  add column if not exists outcome text,
  add column if not exists session_id uuid references public.admin_sessions(id) on delete set null,
  add column if not exists device_label text,
  add column if not exists aal text,
  add column if not exists request_id text;

update public.admin_security_events
   set outcome = case when event = 'login_failed' then 'failure' else 'success' end
 where outcome is null;

alter table public.admin_security_events
  alter column outcome set default 'success',
  alter column outcome set not null,
  add constraint admin_security_events_event_check check (event in (
    'login_succeeded','login_failed','mfa_enrolled','mfa_verified',
    'session_created','session_revoked','session_expired','logout','reauth_required'
  )),
  add constraint admin_security_events_outcome_check check (outcome in ('success','failure','blocked')),
  add constraint admin_security_events_subject_hash_check check (subject_hash is null or subject_hash ~ '^[0-9a-f]{64}$'),
  add constraint admin_security_events_device_label_check check (device_label is null or char_length(device_label) between 1 and 120),
  add constraint admin_security_events_aal_check check (aal is null or aal in ('aal1','aal2')),
  add constraint admin_security_events_request_id_check check (request_id is null or char_length(request_id) between 1 and 128);

create index if not exists admin_security_events_outcome_created_idx
  on public.admin_security_events(outcome, created_at desc);
create index if not exists admin_security_events_session_created_idx
  on public.admin_security_events(session_id, created_at desc) where session_id is not null;

revoke insert, update, delete, truncate on table public.admin_security_events from anon, authenticated;
comment on table public.admin_security_events is
  'Append-only, privacy-minimized Admin login/MFA/session history. Stores a one-way subject/request fingerprint and coarse device label, never raw IP, user-agent, token, password, or MFA secret.';

create or replace function public.consume_content_preview_token(
  p_entity_type text,
  p_entity_id uuid,
  p_token_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_entity_type not in ('page','article')
     or p_entity_id is null
     or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'preview_token_request_invalid';
  end if;

  update public.content_preview_tokens
     set used_at = now()
   where entity_type = p_entity_type
     and entity_id = p_entity_id
     and token_hash = p_token_hash
     and used_at is null
     and expires_at > now()
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.consume_content_preview_token(text, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_content_preview_token(text, uuid, text) to service_role;
comment on function public.consume_content_preview_token(text,uuid,text) is
  'Atomically consumes a one-time CMS preview token; concurrent or replayed requests fail closed.';

-- Rollback-by-forward-fix: preserve security and audit history. Replace policies,
-- functions, or constraints in a later migration; never re-enable browser writes.
