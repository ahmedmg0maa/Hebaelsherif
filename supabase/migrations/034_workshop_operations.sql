-- 034: atomic workshop registration operations and idempotent attendance.
create unique index if not exists workshop_attendance_registration_uidx on public.workshop_attendance(registration_id);
create or replace function public.transition_workshop_registration(p_registration_id uuid,p_status text,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_registration public.workshop_registrations%rowtype;v_workshop public.workshops%rowtype;v_delta int:=0;
begin
  if p_status not in ('registered','cancelled','waitlisted') then raise exception using errcode='22023',message='invalid_registration_status'; end if;
  select * into v_registration from public.workshop_registrations where id=p_registration_id for update;
  if not found then raise exception using errcode='P0002',message='registration_not_found'; end if;
  if v_registration.status=p_status then return jsonb_build_object('outcome','existing','status',p_status); end if;
  select * into v_workshop from public.workshops where id=v_registration.workshop_id for update;
  if p_status='registered' and v_registration.status<>'registered' then
    if v_workshop.seats_total>0 and v_workshop.seats_reserved>=v_workshop.seats_total then raise exception using errcode='23514',message='workshop_capacity_reached'; end if;v_delta:=1;
  elsif p_status<>'registered' and v_registration.status='registered' then v_delta:=-1;end if;
  update public.workshop_registrations set status=p_status where id=p_registration_id;
  update public.workshops set seats_reserved=greatest(0,seats_reserved+v_delta) where id=v_workshop.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'workshop.registration_'||p_status,'workshop_registration',p_registration_id::text,jsonb_build_object('previous',v_registration.status,'seat_delta',v_delta));
  return jsonb_build_object('outcome','updated','status',p_status,'seat_delta',v_delta);
end $$;
revoke all on function public.transition_workshop_registration(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_workshop_registration(uuid,text,uuid) to service_role;

create or replace function public.mark_workshop_attendance(p_registration_id uuid,p_minutes int,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_minutes<0 or p_minutes>1440 then raise exception using errcode='22023',message='invalid_attendance_minutes'; end if;
  if not exists(select 1 from public.workshop_registrations where id=p_registration_id and status='registered') then raise exception using errcode='22023',message='registration_not_active'; end if;
  insert into public.workshop_attendance(registration_id,minutes,attended_at) values(p_registration_id,p_minutes,now()) on conflict(registration_id) do update set minutes=excluded.minutes,attended_at=excluded.attended_at returning id into v_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'workshop.attendance_recorded','workshop_registration',p_registration_id::text,jsonb_build_object('minutes',p_minutes));
  return v_id;
end $$;
revoke all on function public.mark_workshop_attendance(uuid,int,uuid) from public,anon,authenticated;
grant execute on function public.mark_workshop_attendance(uuid,int,uuid) to service_role;
