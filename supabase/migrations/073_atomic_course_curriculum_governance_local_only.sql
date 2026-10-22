-- 073: atomic Admin course curriculum mutations with protected-delivery guardrails.
-- LOCAL ONLY. Apply after 072 on authorized Staging with recovery evidence.

revoke insert, update, delete on table public.course_modules from anon, authenticated;
revoke insert, update, delete on table public.course_lessons from anon, authenticated;

create or replace function public.manage_course_curriculum(
  p_actor_id uuid,
  p_action text,
  p_course_id uuid,
  p_module_id uuid default null,
  p_lesson_id uuid default null,
  p_title text default null,
  p_sort integer default null,
  p_duration_seconds integer default null,
  p_is_preview boolean default false
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_module public.course_modules%rowtype;
  v_lesson public.course_lessons%rowtype;
  v_id uuid;
  v_sort integer;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  if p_action not in ('module_create','module_update','module_delete','lesson_create','lesson_update','lesson_delete')
     or p_course_id is null then
    raise exception using errcode = '22023', message = 'curriculum_action_invalid';
  end if;
  perform 1 from public.courses where id = p_course_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'course_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('course-curriculum:' || p_course_id::text, 0));

  if p_action = 'module_create' then
    if length(v_title) not between 2 and 160 or v_title ~ '[[:cntrl:]]' then
      raise exception using errcode = '22023', message = 'module_title_invalid';
    end if;
    select coalesce(max(sort), 0) + 1 into v_sort from public.course_modules where course_id = p_course_id;
    insert into public.course_modules(course_id, title, sort)
    values (p_course_id, v_title, v_sort) returning id into v_id;
  elsif p_action in ('module_update','module_delete') then
    select * into v_module from public.course_modules
     where id = p_module_id and course_id = p_course_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'module_not_found'; end if;
    if p_action = 'module_update' then
      if length(v_title) not between 2 and 160 or v_title ~ '[[:cntrl:]]'
         or p_sort is null or p_sort not between 1 and 10000 then
        raise exception using errcode = '22023', message = 'module_input_invalid';
      end if;
      update public.course_modules set title = v_title, sort = p_sort where id = v_module.id returning id into v_id;
    else
      if exists(select 1 from public.course_lessons where module_id = v_module.id) then
        raise exception using errcode = '23514', message = 'module_has_lessons';
      end if;
      delete from public.course_modules where id = v_module.id returning id into v_id;
    end if;
  elsif p_action = 'lesson_create' then
    select * into v_module from public.course_modules
     where id = p_module_id and course_id = p_course_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'module_not_found'; end if;
    if length(v_title) not between 2 and 180 or v_title ~ '[[:cntrl:]]'
       or p_duration_seconds is null or p_duration_seconds not between 0 and 86400 then
      raise exception using errcode = '22023', message = 'lesson_input_invalid';
    end if;
    select coalesce(max(sort), 0) + 1 into v_sort from public.course_lessons where module_id = v_module.id;
    insert into public.course_lessons(module_id, title, duration_seconds, sort, is_preview, video_path)
    values (v_module.id, v_title, p_duration_seconds, v_sort, coalesce(p_is_preview, false), null)
    returning id into v_id;
  else
    select lesson.* into v_lesson
      from public.course_lessons lesson
      join public.course_modules module on module.id = lesson.module_id
     where lesson.id = p_lesson_id and module.course_id = p_course_id
     for update of lesson;
    if not found then raise exception using errcode = 'P0002', message = 'lesson_not_found'; end if;
    if p_action = 'lesson_update' then
      if length(v_title) not between 2 and 180 or v_title ~ '[[:cntrl:]]'
         or p_sort is null or p_sort not between 1 and 10000
         or p_duration_seconds is null or p_duration_seconds not between 0 and 86400 then
        raise exception using errcode = '22023', message = 'lesson_input_invalid';
      end if;
      update public.course_lessons
         set title = v_title, sort = p_sort, duration_seconds = p_duration_seconds,
             is_preview = coalesce(p_is_preview, false)
       where id = v_lesson.id returning id into v_id;
    else
      if v_lesson.video_path is not null
         or exists(select 1 from public.lesson_resources where lesson_id = v_lesson.id)
         or exists(select 1 from public.lesson_progress where lesson_id = v_lesson.id)
         or exists(select 1 from public.course_notes where lesson_id = v_lesson.id) then
        raise exception using errcode = '23514', message = 'lesson_has_delivery_or_customer_history';
      end if;
      delete from public.course_lessons where id = v_lesson.id returning id into v_id;
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'curriculum.' || p_action,
    case when p_action like 'module_%' then 'course_module' else 'course_lesson' end,
    v_id::text,
    jsonb_build_object(
      'courseId', p_course_id,
      'moduleId', case when p_action like 'lesson_%' then coalesce(p_module_id, v_lesson.module_id) else v_id end,
      'sort', case when p_action in ('module_create','lesson_create') then v_sort else p_sort end,
      'durationSeconds', case when p_action like 'lesson_%' then p_duration_seconds else null end,
      'preview', case when p_action like 'lesson_%' then coalesce(p_is_preview, false) else null end
    )
  );
  return v_id;
end $$;

revoke all on function public.manage_course_curriculum(uuid,text,uuid,uuid,uuid,text,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.manage_course_curriculum(uuid,text,uuid,uuid,uuid,text,integer,integer,boolean) to service_role;
comment on function public.manage_course_curriculum(uuid,text,uuid,uuid,uuid,text,integer,integer,boolean) is
  'Service-only permission-rechecked curriculum create/update/delete with locks, protected/customer-history deletion guards and atomic metadata-only audit.';

-- Roll back only by forward replacement. Never restore browser-direct curriculum
-- mutation or deletion that can orphan protected delivery/customer history.
