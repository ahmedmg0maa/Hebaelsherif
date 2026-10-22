-- Disposable integration fixtures. The final ROLLBACK retains no users,
-- offerings, bookings, queue items or application settings. Sends no mail.
BEGIN;
SET LOCAL statement_timeout = '45s';
SET LOCAL lock_timeout = '5s';
DO $test$
DECLARE
  customer uuid := gen_random_uuid(); contender uuid := gen_random_uuid();
  product_a uuid := gen_random_uuid(); product_b uuid := gen_random_uuid();
  service_a uuid := gen_random_uuid(); service_b uuid := gen_random_uuid();
  day date := (now() at time zone 'Africa/Cairo')::date + 7;
  held jsonb; replay jsonb; booked jsonb; booked_again jsonb; booking uuid;
  denied boolean := false;
BEGIN
  day:=day+((7-extract(dow from day)::int)%7);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
    (customer,'launch-'||customer||'@example.test','{"full_name":"عميلة اختبار معزولة"}'),
    (contender,'launch-'||contender||'@example.test','{"full_name":"اختبار تنافس معزول"}');
  INSERT INTO public.products(id,type,slug,title,price,is_published) VALUES
    (product_a,'session','launch-'||product_a,'اختبار معزول أ',0,true),
    (product_b,'session','launch-'||product_b,'اختبار معزول ب',0,true);
  INSERT INTO public.services(id,product_id,slug,title,duration_minutes,price,is_active,booking_payment_mode,minimum_notice_minutes,booking_window_days,cancellation_notice_hours,buffer_before_minutes,buffer_after_minutes) VALUES
    (service_a,product_a,'launch-'||service_a,'اختبار معزول أ',30,0,true,'free',0,30,0,0,0),
    (service_b,product_b,'launch-'||service_b,'اختبار معزول ب',60,0,true,'free',0,30,0,0,0);
  INSERT INTO public.availability_rules(service_id,weekday,start_time,end_time)
    SELECT s,d,'09:00'::time,'17:00'::time FROM unnest(ARRAY[service_a,service_b]) s CROSS JOIN generate_series(0,6) d;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated','aal','aal1')::text,true);
  held := public.create_booking_hold(service_a,day,'10:00');
  replay := public.create_booking_hold(service_a,day,'10:00');
  IF held->>'holdId' IS DISTINCT FROM replay->>'holdId' OR held->>'expiresAt' IS DISTINCT FROM replay->>'expiresAt' THEN
    RAISE EXCEPTION 'hold_retry_not_idempotent';
  END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',contender,'role','authenticated','aal','aal1')::text,true);
  BEGIN
    PERFORM public.create_booking_hold(service_b,day,'10:00');
  EXCEPTION WHEN exclusion_violation THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'cross_service_overlap_allowed'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated','aal','aal1')::text,true);
  booked := public.create_free_booking_from_hold((held->>'holdId')::uuid,'عميلة اختبار معزولة','01000000000','');
  booked_again := public.create_free_booking_from_hold((held->>'holdId')::uuid,'عميلة اختبار معزولة','01000000000','');
  booking := (booked->>'bookingId')::uuid;
  IF booking IS NULL OR booked->>'bookingId' IS DISTINCT FROM booked_again->>'bookingId'
     OR booked->>'bookingStatus' <> 'confirmed' THEN RAISE EXCEPTION 'booking_confirmation_or_replay_failed'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE user_id=customer) <> 1 THEN RAISE EXCEPTION 'duplicate_booking'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.coach_calendar_reservations WHERE source_kind='booking' AND source_id=booking)
     OR NOT EXISTS(SELECT 1 FROM public.booking_email_outbox WHERE booking_id=booking AND status='pending') THEN
    RAISE EXCEPTION 'calendar_or_mail_snapshot_missing';
  END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
  PERFORM public.cancel_customer_booking_governed(customer,booking,'اختبار معزول');
  IF (SELECT status FROM public.bookings WHERE id=booking) <> 'cancelled'
     OR EXISTS(SELECT 1 FROM public.coach_calendar_reservations WHERE source_kind='booking' AND source_id=booking)
     OR NOT public.booking_slot_is_available(service_b,day,'10:00') THEN RAISE EXCEPTION 'cancellation_did_not_release_slot'; END IF;
  IF has_function_privilege('anon','public.create_booking_hold(uuid,date,time)','execute')
     OR has_function_privilege('authenticated','public.create_booking_order(uuid,date,time,text,text,text)','execute')
     OR has_table_privilege('authenticated','public.booking_email_outbox','select') THEN RAISE EXCEPTION 'booking_internal_grant_exposed'; END IF;
  RAISE NOTICE 'PASS holds/retries, cross-service conflict, confirmation/replay, calendar, queued email, cancellation/release, internal privilege denial';
END $test$;
ROLLBACK;
