-- Additive free-launch operations. No provider subscription or email is created.
-- Budget reservations count ATTEMPTS conservatively, not invoices or delivery.
create table public.application_email_budget (
  id bigint generated always as identity primary key,
  attempt_key text not null unique,
  reserved_at timestamptz not null default now()
);
create index application_email_budget_time on public.application_email_budget(reserved_at);
alter table public.application_email_budget enable row level security;
revoke all on public.application_email_budget from public,anon,authenticated,service_role;

create function public.reserve_free_email_attempt(p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_key !~ '^(booking/[0-9]+/[1-5]|inbox/[0-9a-f-]{36}/[1-5])$' then raise exception 'invalid email budget key'; end if;
 perform pg_advisory_xact_lock(hashtextextended('application-free-email-budget',0));
 if exists(select 1 from public.application_email_budget where attempt_key=p_key) then return true; end if;
 -- A rolling 24h ceiling is stricter than the provider calendar-day ceiling.
 -- Leave allowance for Auth SMTP; other apps on the same provider are outside this budget.
 if (select count(*) from public.application_email_budget where reserved_at>now()-interval '24 hours')>=80
 or (select count(*) from public.application_email_budget where reserved_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')>=2400 then return false; end if;
 delete from public.application_email_budget where reserved_at<now()-interval '40 days';
 insert into public.application_email_budget(attempt_key) values(p_key);
 return true;
end $$;
revoke all on function public.reserve_free_email_attempt(text) from public,anon,authenticated,service_role;

create or replace function public.claim_booking_emails(p_limit int default 1) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]'::jsonb; item public.booking_email_outbox%rowtype; recipient text; lease uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501'; end if;
 if p_limit not between 1 and 5 then raise exception 'invalid batch'; end if;
 update public.booking_email_outbox o set status='superseded'
 where o.status in ('pending','failed') and exists(select 1 from public.booking_email_outbox n where n.booking_id=o.booking_id and n.id>o.id);
 update public.booking_email_outbox set status='failed',error_code='delivery_window_expired',next_attempt_at='infinity',lease_until=null
 where status in ('pending','sending','failed') and first_attempt_at<now()-interval '23 hours';
 for item in select * from public.booking_email_outbox
 where status in ('pending','failed','sending') and next_attempt_at<=now() and attempts<5
 and (lease_until is null or lease_until<now())
 order by id limit p_limit for update skip locked loop
  if not public.reserve_free_email_attempt('booking/'||item.id||'/'||(item.attempts+1)) then exit; end if;
  select email into recipient from auth.users where id=item.user_id;
  lease:=gen_random_uuid();
  update public.booking_email_outbox set status='sending',attempts=attempts+1,lease_id=lease,
   lease_until=now()+interval '3 minutes',first_attempt_at=coalesce(first_attempt_at,now()) where id=item.id;
  result:=result||jsonb_build_array(jsonb_build_object('id',item.id::text,'leaseId',lease,'to',recipient,'subject',item.subject,'text',item.body));
 end loop;
 return result;
end $$;

-- Retain existing inbox permission/claim/audit semantics, and couple the quota
-- reservation with them. A budget rejection rolls the entire claim back.
alter function public.claim_email_outbox(uuid,uuid) rename to claim_email_outbox_pre_free;
revoke all on function public.claim_email_outbox_pre_free(uuid,uuid) from public,anon,authenticated,service_role;
create function public.claim_email_outbox(p_outbox_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare claimed jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501'; end if;
 claimed:=public.claim_email_outbox_pre_free(p_outbox_id,p_actor_id);
 if not public.reserve_free_email_attempt('inbox/'||p_outbox_id||'/'||(claimed->>'attempt')) then
  raise exception 'email_free_budget_exceeded' using errcode='54000';
 end if;
 return claimed;
end $$;
revoke all on function public.claim_email_outbox(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_email_outbox(uuid,uuid) to service_role;

create or replace function public.finalize_booking_email(p_id bigint,p_lease uuid,p_sent boolean,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501'; end if;
 if p_error is not null and p_error not in ('provider_unavailable','provider_rejected','provider_rate_limited','invalid_recipient','provider_auth_failed','provider_payload_rejected') then raise exception 'invalid error'; end if;
 if (p_sent and p_error is not null) or (not p_sent and p_error is null) then raise exception 'invalid delivery outcome'; end if;
 update public.booking_email_outbox set status=case when p_sent then 'sent' else 'failed' end,
  sent_at=case when p_sent then now() end,error_code=p_error,
  next_attempt_at=case when p_sent or p_error in ('invalid_recipient','provider_auth_failed','provider_payload_rejected') then 'infinity'::timestamptz
   when p_error='provider_rate_limited' then now()+interval '15 minutes' else now()+interval '5 minutes' end,
  lease_until=null where id=p_id and lease_id=p_lease and status='sending';
 return found;
end $$;

create function public.free_launch_mail_status(p_actor uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' or not public.has_permission('system.view',p_actor) then
  raise exception 'system permission required' using errcode='42501'; end if;
 return jsonb_build_object(
 'reserved24h',(select count(*) from public.application_email_budget where reserved_at>now()-interval '24 hours'),
 'reservedMonth',(select count(*) from public.application_email_budget where reserved_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),
 'pending',(select count(*) from public.booking_email_outbox where status in ('pending','failed') and next_attempt_at< 'infinity'::timestamptz and attempts<5),
 'terminalFailures',(select count(*) from public.booking_email_outbox where status='failed' and (next_attempt_at='infinity'::timestamptz or attempts>=5)),
 'oldestPendingAt',(select min(created_at) from public.booking_email_outbox where status in ('pending','failed') and next_attempt_at<'infinity'::timestamptz and attempts<5),
 'lastSentAt',(select max(sent_at) from public.booking_email_outbox where status='sent'),
 'dailyLimit',80,'monthlyLimit',2400
 );
end $$;
revoke all on function public.free_launch_mail_status(uuid) from public,anon,authenticated;
grant execute on function public.free_launch_mail_status(uuid) to service_role;

create or replace function public.launch_runtime_contract() returns jsonb
language sql stable security definer set search_path='' as $$
 select '{"revision":"102","owner":"096","calendar":"097","mail":"102","stream":"099","admission":"100","home":"101","freeOperations":"102"}'::jsonb
$$;

