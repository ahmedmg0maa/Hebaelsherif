create function public.admin_save_lesson_text(p_actor uuid,p_lesson uuid,p_text text) returns void
language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if p_actor is null or not public.has_permission('learning.manage',p_actor) then raise exception using errcode='42501',message='learning_management_required';end if;
 if p_text is null or char_length(p_text)>30000 or p_text ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' then raise exception 'lesson_text_invalid';end if;
 select m.course_id into cid from public.course_modules m join public.course_lessons l on l.module_id=m.id where l.id=p_lesson;
 if not found then raise exception 'lesson_not_found';end if;
 perform 1 from public.courses where id=cid for update;
 perform pg_advisory_xact_lock(hashtextextended('course-curriculum:'||cid::text,0));
 update public.course_lessons set description=p_text where id=p_lesson;
 -- A published text-only course must remain complete after editing.
 if exists(select 1 from public.courses where id=cid and is_published) then perform public.catalog_require_publication_ready('course',cid);end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'curriculum.lesson_text_saved','course_lesson',p_lesson::text,jsonb_build_object('characters',char_length(p_text)));
end $$;
revoke all on function public.admin_save_lesson_text(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_save_lesson_text(uuid,uuid,text) to service_role;

create table public.catalog_publication_jobs (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('course','book','workshop')),
 item_id uuid not null,
 action text not null check(action in ('publish','hide')),
 run_at timestamptz not null,
 actor_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','done','failed','cancelled')),
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
create index catalog_jobs_due on public.catalog_publication_jobs(run_at) where status='pending';
alter table public.catalog_publication_jobs enable row level security;
revoke all on public.catalog_publication_jobs from public,anon,authenticated,service_role;
grant select on public.catalog_publication_jobs to authenticated,service_role;
create policy "catalog schedules: permitted read" on public.catalog_publication_jobs for select to authenticated using(public.has_permission('catalog.view') or public.has_permission('catalog.manage'));
create function public.admin_schedule_catalog(p_actor uuid,p_kind text,p_item uuid,p_action text,p_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare tbl text; pid uuid; jid uuid;
begin
 if p_actor is null or not public.has_permission('catalog.publish',p_actor) then raise exception using errcode='42501',message='catalog_publish_required';end if;
 tbl:=case p_kind when 'course' then 'courses' when 'book' then 'books' when 'workshop' then 'workshops' end;
 if tbl is null or p_action not in ('publish','hide','cancel') then raise exception 'catalog_schedule_invalid';end if;
 execute format('select product_id from public.%I where id=$1 for update',tbl) into pid using p_item;
 if pid is null then raise exception 'catalog_not_found';end if;
 update public.catalog_publication_jobs set status='cancelled',completed_at=now() where kind=p_kind and item_id=p_item and status='pending' and (action=p_action or p_action='cancel');
 if p_action='cancel' then
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'catalog.schedule_cancelled',p_kind,p_item::text,'{}');return null;end if;
 if p_at is null or p_at<=now() or p_at>now()+interval '2 years' then raise exception 'catalog_schedule_date_invalid';end if;
 if p_action='publish' then
  if exists(select 1 from public.products where id=pid and archived_at is not null) then raise exception 'catalog_restore_required';end if;
  perform public.catalog_require_publication_ready(p_kind,p_item);
 end if;
 insert into public.catalog_publication_jobs(kind,item_id,action,run_at,actor_id) values(p_kind,p_item,p_action,p_at,p_actor) returning id into jid;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'catalog.schedule_saved',p_kind,p_item::text,jsonb_build_object('jobId',jid,'action',p_action,'runAt',p_at));
 return jid;
end $$;
create function public.process_catalog_publication_jobs() returns integer
language plpgsql security definer set search_path='' as $$
declare j record; n integer:=0;
begin
 -- Deterministic due order; concurrent cron invocations cannot repeat a job.
 for j in select * from public.catalog_publication_jobs where status='pending' and run_at<=now() order by run_at,id limit 5 for update skip locked loop
  begin
   if j.action='publish' and exists(select 1 from public.products p where p.archived_at is not null and p.id=(case j.kind when 'course' then (select product_id from public.courses where id=j.item_id) when 'book' then (select product_id from public.books where id=j.item_id) else (select product_id from public.workshops where id=j.item_id) end)) then raise exception 'catalog_restore_required';end if;
   perform public.manage_catalog_item(j.actor_id,j.kind,j.item_id,'publication',jsonb_build_object('is_published',j.action='publish'));
   update public.catalog_publication_jobs set status='done',completed_at=now() where id=j.id;
  exception when others then
   update public.catalog_publication_jobs set status='failed',completed_at=now() where id=j.id;
   insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(j.actor_id,'catalog.schedule_failed',j.kind,j.item_id::text,jsonb_build_object('jobId',j.id,'sqlstate',sqlstate));
  end;
  n:=n+1;
 end loop;return n;
end $$;
revoke all on function public.admin_schedule_catalog(uuid,text,uuid,text,timestamptz),public.process_catalog_publication_jobs() from public,anon,authenticated;
grant execute on function public.admin_schedule_catalog(uuid,text,uuid,text,timestamptz),public.process_catalog_publication_jobs() to service_role;
