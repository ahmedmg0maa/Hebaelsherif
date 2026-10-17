BEGIN;
SET LOCAL statement_timeout='45s';
SET LOCAL lock_timeout='5s';
DO $test$
declare
 actor uuid; customer uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); s uuid:=gen_random_uuid();
 d date:=(now() at time zone 'Africa/Cairo')::date+7;
 h jsonb; b jsonb; bid uuid; x uuid; denied boolean;
begin
 d:=d+((7-extract(dow from d)::int)%7);
 select user_id into actor from public.admin_roles where role='owner' limit 1;
 if actor is null then raise exception 'fixture_owner_missing';end if;
 insert into auth.users(id,email,raw_user_meta_data) values(customer,'schedule-'||customer||'@example.test','{}');
 insert into public.products(id,type,slug,title,price,is_published) values(p,'session','schedule-'||p,'معزول',0,true);
 insert into public.services(id,product_id,slug,title,duration_minutes,price,is_active,booking_payment_mode,minimum_notice_minutes,booking_window_days,cancellation_notice_hours,buffer_before_minutes,buffer_after_minutes)
 values(s,p,'schedule-'||s,'معزول',30,0,true,'free',0,30,0,15,15);
 insert into public.availability_rules(service_id,weekday,start_time,end_time) select s,n,'10:00','20:00' from generate_series(0,6)n;
 if public.booking_slot_is_available(s,d,'10:00') or public.booking_slot_is_available(s,d,'19:30')
 or not public.booking_slot_is_available(s,d,'10:30') or public.booking_slot_is_available(s,d+5,'12:00') then raise exception 'weekly_or_buffers_failed'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 x:=public.admin_save_coach_exception(actor,d+5,'open','12:00','14:00','اختبار معزول');
 if not public.booking_slot_is_available(s,d+5,'12:30') or public.booking_slot_is_available(s,d+5,'12:00') then raise exception 'exceptional_opening_failed';end if;
 perform public.admin_delete_coach_exception(actor,x);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated','aal','aal1')::text,true);
 h:=public.create_booking_hold(s,d,'10:30');
 if h->>'holdId' is distinct from public.create_booking_hold(s,d,'10:30')->>'holdId' then raise exception 'hold_retry_failed';end if;
 b:=public.create_free_booking_from_hold((h->>'holdId')::uuid,'اختبار معزول','01000000000','');bid:=(b->>'bookingId')::uuid;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 denied:=false;
 begin perform public.admin_save_coach_exception(actor,d,'closed','10:00','11:00','اختبار');
 exception when exclusion_violation then denied:=sqlerrm='COACH_SCHEDULE_CONFLICT';end;
 if not denied or not exists(select 1 from public.bookings where id=bid and status='confirmed') then raise exception 'closure_did_not_preserve_booking';end if;
 perform public.admin_update_booking_governed(actor,bid,((d+time '12:00') at time zone 'Africa/Cairo'),'confirmed',null,'');
 if not public.booking_slot_is_available(s,d,'10:30') or public.booking_slot_is_available(s,d,'12:00') then raise exception 'move_failed';end if;
 x:=public.admin_save_coach_exception(actor,d,'closed','10:00','11:00','اختبار');
 if public.booking_slot_is_available(s,d,'10:30') then raise exception 'partial_closure_failed';end if;
 perform public.admin_delete_coach_exception(actor,x);
 denied:=false;
 begin perform public.admin_save_coach_exception(customer,d,'closed','00:00','24:00','');exception when insufficient_privilege then denied:=true;end;
 if not denied or has_function_privilege('authenticated','public.admin_save_coach_hours(uuid,jsonb)','execute')
 or has_table_privilege('anon','public.coach_schedule_exceptions','select') then raise exception 'permissions_failed';end if;
 if (timestamp '2026-07-01 10:00' at time zone 'Africa/Cairo')<>(timestamp '2026-07-01 07:00' at time zone 'UTC')
 or (timestamp '2026-12-01 10:00' at time zone 'Africa/Cairo')<>(timestamp '2026-12-01 08:00' at time zone 'UTC') then raise exception 'cairo_dst_failed';end if;
 raise notice 'PASS weekly hours, occupied buffers, Friday closed, exceptional opening, hold retry, confirmation, conflict rollback, admin move, partial close/restore, permission denial and Cairo DST';
end $test$;
ROLLBACK;
