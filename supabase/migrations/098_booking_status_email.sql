-- Transactional, immutable booking mail snapshots. Only service-role workers
-- can lease/finalize delivery; no mail is sent by SQL or by this migration.
create table public.booking_email_outbox (
 id bigint generated always as identity primary key,
 booking_id uuid not null references public.bookings(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 subject text not null, body text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','superseded')),
 created_at timestamptz not null default now(), next_attempt_at timestamptz not null default now(),
 attempts int not null default 0, lease_id uuid, lease_until timestamptz,
 first_attempt_at timestamptz, sent_at timestamptz, error_code text
);
alter table public.booking_email_outbox enable row level security;
revoke all on public.booking_email_outbox from public,anon,authenticated,service_role;
create function public.queue_booking_status_email() returns trigger language plpgsql security definer set search_path='' as $$
declare label text; title text;
begin
 if tg_op='UPDATE' and new.status=old.status and new.starts_at=old.starts_at and new.meeting_url is not distinct from old.meeting_url then return new; end if;
 label:=case new.status when 'pending' then 'طلب حجز بانتظار التأكيد' when 'confirmed' then 'حجزك مؤكد' when 'cancelled' then 'تم إلغاء الحجز' when 'completed' then 'اكتملت جلستك' else 'تحديث على حجزك' end;
 select s.title into title from public.services s where s.id=new.service_id;
 insert into public.booking_email_outbox(booking_id,user_id,subject,body) values(new.id,new.user_id,label,
 label||E'\n'||coalesce(title,'جلسة فردية')||E'\nالموعد: '||to_char(new.starts_at at time zone 'Africa/Cairo','YYYY-MM-DD HH24:MI')||E' بتوقيت القاهرة.\nراجعي الحالة وتفاصيل اللقاء من حسابك.');
 return new;
end $$;
revoke all on function public.queue_booking_status_email() from public,anon,authenticated,service_role;
create trigger booking_status_email after insert or update on public.bookings for each row execute function public.queue_booking_status_email();
create function public.claim_booking_emails(p_limit int default 5) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501';end if;
 if p_limit not between 1 and 5 then raise exception 'invalid batch';end if;
 update public.booking_email_outbox o set status='superseded' where status in ('pending','failed') and exists(select 1 from public.booking_email_outbox n where n.booking_id=o.booking_id and n.id>o.id);
 -- Resend retains idempotency keys for 24h. Never retry an ambiguous send beyond it.
 update public.booking_email_outbox set status='failed',error_code='delivery_window_expired',next_attempt_at='infinity' where status in ('pending','sending','failed') and first_attempt_at<now()-interval '23 hours';
 with selected as (select id from public.booking_email_outbox where status in ('pending','failed','sending') and next_attempt_at<=now() and attempts<5 and (lease_until is null or lease_until<now()) order by id limit p_limit for update skip locked),
 leased as (update public.booking_email_outbox o set status='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes',first_attempt_at=coalesce(first_attempt_at,now()) from selected s where s.id=o.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id::text,'leaseId',l.lease_id,'to',u.email,'subject',l.subject,'text',l.body)),'[]'::jsonb) into result from leased l join auth.users u on u.id=l.user_id;
 return result;
end $$;
create function public.finalize_booking_email(p_id bigint,p_lease uuid,p_sent boolean,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'server role required' using errcode='42501';end if;
 if p_error is not null and p_error not in ('provider_unavailable','provider_rejected','provider_rate_limited','invalid_recipient') then raise exception 'invalid error';end if;
 update public.booking_email_outbox set status=case when p_sent then 'sent' else 'failed' end,sent_at=case when p_sent then now() end,
 error_code=p_error,next_attempt_at=now()+interval '30 minutes',lease_until=null where id=p_id and lease_id=p_lease and status='sending';
 return found;
end $$;
revoke all on function public.claim_booking_emails(int),public.finalize_booking_email(bigint,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_booking_emails(int),public.finalize_booking_email(bigint,uuid,boolean,text) to service_role;
