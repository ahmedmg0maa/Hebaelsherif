-- Extends existing governed actions. No public campaign is created/enabled.
create function public.guard_service_schedule_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare sid uuid:=coalesce(new.service_id,old.service_id); r record; a timestamp; b timestamp; allowed boolean; x record;
begin
 for r in select * from public.coach_calendar_reservations where service_id=sid and ends_at>now() and (expires_at is null or expires_at>now()) loop
  a:=lower(r.occupied) at time zone 'Africa/Cairo';b:=upper(r.occupied) at time zone 'Africa/Cairo';
  allowed:=exists(select 1 from public.availability_rules w where w.service_id=sid and w.weekday=extract(dow from a)::int and a::time>=w.start_time and b::time<=w.end_time)
    or exists(select 1 from public.coach_schedule_exceptions e where e.kind='open' and e.date=a::date and a::time>=e.start_time and b::time<=e.end_time);
  select * into x from public.availability_exceptions e where e.service_id=sid and e.date=a::date;
  if found then
   if x.kind in ('closed','holiday','blackout') then allowed:=false;
   elsif x.kind='custom' then allowed:=a::time>=x.start_time and b::time<=x.end_time;end if;
  end if;
  if exists(select 1 from public.booking_slot_overrides e where e.service_id=sid and e.date=a::date and e.start_time=(r.starts_at at time zone 'Africa/Cairo')::time and e.mode='open') then allowed:=true;end if;
  if exists(select 1 from public.availability_exceptions e where e.service_id=sid and e.date=a::date and e.kind in ('closed','holiday','blackout'))
   or exists(select 1 from public.booking_slot_overrides e where e.service_id=sid and e.date=a::date and e.start_time=(r.starts_at at time zone 'Africa/Cairo')::time and e.mode='closed') then allowed:=false;end if;
  if not allowed then raise exception using errcode='23P01',message='COACH_SCHEDULE_CONFLICT';end if;
 end loop;
 return null;
end $$;
create trigger coach_rules_lock before insert or update or delete on public.availability_rules for each statement execute function public.lock_coach_schedule();
create trigger coach_exceptions_lock before insert or update or delete on public.availability_exceptions for each statement execute function public.lock_coach_schedule();
create trigger coach_overrides_lock before insert or update or delete on public.booking_slot_overrides for each statement execute function public.lock_coach_schedule();
create trigger coach_rules_preserve after insert or update or delete on public.availability_rules for each row execute function public.guard_service_schedule_change();
create trigger coach_exceptions_preserve after insert or update or delete on public.availability_exceptions for each row execute function public.guard_service_schedule_change();
create trigger coach_overrides_preserve after insert or update or delete on public.booking_slot_overrides for each row execute function public.guard_service_schedule_change();
revoke all on function public.guard_service_schedule_change() from public,anon,authenticated,service_role;

-- Global fallback-buffer edits also recompute occupied reservations atomically.
create function public.refresh_default_coach_buffers() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.key='booking_policy' and new.value is distinct from old.value then
  delete from public.coach_calendar_reservations where expires_at<=now();
  update public.coach_calendar_reservations set occupied=public.coach_occupied_range(service_id,starts_at,ends_at) where ends_at>now();
 end if;return new;
end $$;
create trigger coach_settings_lock before update on public.site_settings for each statement execute function public.lock_coach_schedule();
create trigger coach_default_buffers after update on public.site_settings for each row execute function public.refresh_default_coach_buffers();
revoke all on function public.refresh_default_coach_buffers() from public,anon,authenticated,service_role;

alter table public.offers add column cta_label text not null default 'تفاصيل العرض' check(char_length(cta_label) between 2 and 80),
 add column cta_href text not null default '/offers' check(char_length(cta_href)<=180 and cta_href ~ '^/[a-zA-Z0-9/_?=&-]*$'),
 add column terms text not null default '' check(char_length(terms)<=2000),
 add column show_on_home boolean not null default false;
alter function public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid) rename to manage_commerce_record_087;
revoke all on function public.manage_commerce_record_087(uuid,text,uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.manage_commerce_record(p_actor_id uuid,p_kind text,p_id uuid,p_action text,p_content jsonb default '{}'::jsonb,p_parent_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; label text; href text; v_terms text;
begin
 if p_kind='coupon' and p_action='save' then
  if p_content ? 'allow_with_offers' and jsonb_typeof(p_content->'allow_with_offers') is distinct from 'boolean' then raise exception 'coupon_stacking_invalid';end if;
  result:=public.manage_commerce_record_087(p_actor_id,p_kind,p_id,p_action,p_content-'allow_with_offers',p_parent_id);
  update public.coupons set allow_with_offers=coalesce((p_content->>'allow_with_offers')::boolean,false) where id=(result->>'id')::uuid;
  return result;
 end if;
 if p_kind='offer' and p_action='save' then
  label:=coalesce(p_content->>'cta_label','تفاصيل العرض');href:=coalesce(p_content->>'cta_href','/offers');v_terms:=coalesce(p_content->>'terms','');
  if char_length(label) not between 2 and 80 or char_length(href)>180 or href !~ '^/[a-zA-Z0-9/_?=&-]*$' or href like '//%'
   or char_length(v_terms)>2000 or jsonb_typeof(p_content->'is_active') is distinct from 'boolean'
   or jsonb_typeof(p_content->'show_on_home') is distinct from 'boolean' then raise exception using errcode='22023',message='offer_presentation_invalid';end if;
  result:=public.manage_commerce_record_087(p_actor_id,p_kind,p_id,p_action,p_content-array['cta_label','cta_href','terms','show_on_home','is_active'],p_parent_id);
  update public.offers set cta_label=label,cta_href=href,terms=v_terms,show_on_home=(p_content->>'show_on_home')::boolean,is_active=(p_content->>'is_active')::boolean where id=(result->>'id')::uuid;
  return result;
 end if;
 return public.manage_commerce_record_087(p_actor_id,p_kind,p_id,p_action,p_content,p_parent_id);
end $$;
revoke all on function public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid) to service_role;
