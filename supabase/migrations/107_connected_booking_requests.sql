-- Display real services and accept reviewable appointment requests without
-- inventing a payment account, recording a payment, or changing service prices.
alter table public.services add column request_enabled boolean not null default false;
alter table public.bookings add column requested_price numeric(10,2) check(requested_price>=0);
alter table public.bookings add column requested_currency text check(requested_currency ~ '^[A-Z]{3}$');
alter table public.bookings add column request_expires_at timestamptz;

alter function public.manage_catalog_item(uuid,text,uuid,text,jsonb) rename to manage_catalog_item_before_107;
revoke all on function public.manage_catalog_item_before_107(uuid,text,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.manage_catalog_item(p_actor_id uuid,p_kind text,p_id uuid,p_action text,p_content jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; previous boolean;
begin
 if p_kind='service' and p_action='save' and p_content ? 'request_enabled'
    and jsonb_typeof(p_content->'request_enabled') is distinct from 'boolean' then
   raise exception using errcode='22023',message='invalid_request_mode';
 end if;
 if p_kind='service' and p_id is not null then select request_enabled into previous from public.services where id=p_id;end if;
 result:=public.manage_catalog_item_before_107(p_actor_id,p_kind,p_id,p_action,case when p_kind='service' and p_action='save' then p_content-'request_enabled' else p_content end);
 if p_kind='service' and p_action='save' and p_content ? 'request_enabled' then
   update public.services set request_enabled=(p_content->>'request_enabled')::boolean where id=(result->>'id')::uuid;
   if previous is distinct from (p_content->>'request_enabled')::boolean then
     insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
     values(p_actor_id,'service.request_mode_updated','service',result->>'id',jsonb_build_object('enabled',(p_content->>'request_enabled')::boolean));
   end if;
 end if;
 return result;
end $$;
revoke all on function public.manage_catalog_item(uuid,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_catalog_item(uuid,text,uuid,text,jsonb) to service_role;

alter function public.complete_booking_hold_v2(uuid,text,text,text,text,uuid) rename to complete_booking_hold_before_107;
revoke all on function public.complete_booking_hold_before_107(uuid,text,text,text,text,uuid) from public,anon,authenticated,service_role;
create function public.complete_booking_hold_v2(p_hold_id uuid,p_mode text,p_full_name text,p_phone text,p_notes text default '',p_subscription_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();h public.booking_holds%rowtype;s public.services%rowtype;p public.products%rowtype;
 receipt public.booking_hold_receipts%rowtype;b public.bookings%rowtype;request_hash text;result jsonb;
begin
 if p_mode is distinct from 'request' then
   return public.complete_booking_hold_before_107(p_hold_id,p_mode,p_full_name,p_phone,p_notes,p_subscription_id);
 end if;
 if actor is null then raise exception using errcode='42501',message='AUTH_REQUIRED';end if;
 if p_subscription_id is not null then raise exception using errcode='22023',message='INVALID_PAYMENT_MODE';end if;
 if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 160 then raise exception using errcode='22023',message='INVALID_NAME';end if;
 if btrim(coalesce(p_phone,'')) !~ '^[+]?[0-9[:space:]-]{8,18}$' then raise exception using errcode='22023',message='INVALID_PHONE';end if;
 if char_length(coalesce(p_notes,''))>2000 then raise exception using errcode='22023',message='INVALID_NOTES';end if;
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 select * into h from public.booking_holds where id=p_hold_id and user_id=actor for update;
 if not found then raise exception using errcode='22023',message='HOLD_EXPIRED';end if;
 request_hash:=encode(extensions.digest(jsonb_build_array(p_mode,btrim(p_full_name),btrim(p_phone),btrim(coalesce(p_notes,'')),p_subscription_id)::text,'sha256'),'hex');
 select * into receipt from public.booking_hold_receipts where hold_id=h.id and user_id=actor;
 if found then
   if receipt.request_hash<>request_hash then raise exception using errcode='23505',message='BOOKING_ATTEMPT_CONFLICT';end if;
   select * into strict b from public.bookings where id=receipt.booking_id and user_id=actor;
   return receipt.result||jsonb_build_object('bookingStatus',b.status,'confirmed',b.status='confirmed','requested',true,'total',b.requested_price,'currency',b.requested_currency);
 end if;
 if h.status<>'active' or h.expires_at<=now() then raise exception using errcode='22023',message='HOLD_EXPIRED';end if;
 select * into s from public.services where id=h.service_id;
 select * into p from public.products where id=s.product_id;
 if not s.request_enabled or not s.is_active or not p.is_published or p.archived_at is not null or s.booking_payment_mode<>'payment_required' then
   raise exception using errcode='22023',message='INVALID_PAYMENT_MODE';
 end if;
 if not public.booking_slot_is_available(s.id,(h.starts_at at time zone 'Africa/Cairo')::date,(h.starts_at at time zone 'Africa/Cairo')::time,null,h.id) then
   raise exception using errcode='23P01',message='SLOT_UNAVAILABLE';end if;
 if exists(select 1 from public.bookings where user_id=actor and request_expires_at>now() and status='pending') then
   raise exception using errcode='23514',message='PENDING_REQUEST_EXISTS';end if;
 update public.profiles set full_name=btrim(p_full_name),phone=btrim(p_phone) where id=actor;
 insert into public.bookings(user_id,service_id,starts_at,ends_at,status,customer_notes,requested_price,requested_currency,request_expires_at)
 values(actor,s.id,h.starts_at,h.ends_at,'pending',nullif(btrim(coalesce(p_notes,'')),''),s.price,p.currency,least(now()+interval '24 hours',h.starts_at)) returning * into b;
 update public.booking_holds set status='converted',released_at=now() where id=h.id;
 result:=jsonb_build_object('bookingId',b.id,'requested',true,'confirmed',false,'bookingStatus','pending','orderStatus',null,'total',b.requested_price,'currency',b.requested_currency,'expiresAt',null);
 insert into public.booking_hold_receipts(hold_id,user_id,request_hash,booking_id,result) values(h.id,actor,request_hash,b.id,result);
 insert into public.booking_events(booking_id,actor_id,event,meta) values(b.id,actor,'booking.requested',jsonb_build_object('price',b.requested_price,'currency',b.requested_currency,'expiresAt',b.request_expires_at));
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(actor,'booking.requested','booking',b.id::text,jsonb_build_object('price',b.requested_price,'currency',b.requested_currency));
 return result;
end $$;
revoke all on function public.complete_booking_hold_v2(uuid,text,text,text,text,uuid) from public,anon,service_role;
grant execute on function public.complete_booking_hold_v2(uuid,text,text,text,text,uuid) to authenticated;

create function public.expire_booking_requests() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception using errcode='42501',message='server_role_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 with expired as (select id from public.bookings where status='pending' and order_id is null and request_expires_at<=now() order by request_expires_at limit 25 for update skip locked),
 changed as (update public.bookings b set status='cancelled' from expired e where b.id=e.id returning b.id)
 insert into public.booking_events(booking_id,event,meta) select id,'booking.request_expired','{}'::jsonb from changed;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.expire_booking_requests() from public,anon,authenticated;
grant execute on function public.expire_booking_requests() to service_role;

create or replace function public.booking_runtime_contract() returns jsonb language sql stable security definer set search_path='' as $$
 select public.booking_runtime_contract_093()||'{"coachCalendar":"097","coachWorkingHours":"103","customerRequests":"107"}'::jsonb
$$;
