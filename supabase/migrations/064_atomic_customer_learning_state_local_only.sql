-- 064: enrollment-bound, atomic customer learning progress and private notes.
-- LOCAL ONLY. Apply after 063 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "course_progress: own" on public.course_progress;
drop policy if exists "lesson_progress: own" on public.lesson_progress;
drop policy if exists "course_notes: own" on public.course_notes;

create policy "course_progress: own read" on public.course_progress
  for select using (user_id = auth.uid());
create policy "lesson_progress: own read" on public.lesson_progress
  for select using (user_id = auth.uid());
create policy "course_notes: own read" on public.course_notes
  for select using (user_id = auth.uid());

revoke insert, update, delete on table public.course_progress from anon, authenticated;
revoke insert, update, delete on table public.lesson_progress from anon, authenticated;
revoke insert, update, delete on table public.course_notes from anon, authenticated;

create or replace function public.set_customer_lesson_completion(
  p_actor_id uuid,
  p_lesson_id uuid,
  p_completed boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_progress public.lesson_progress%rowtype;
  v_was_completed boolean := false;
  v_total integer := 0;
  v_completed integer := 0;
  v_percent numeric(5,2) := 0;
begin
  if p_actor_id is null or p_lesson_id is null or p_completed is null then
    raise exception using errcode = '22023', message = 'learning_completion_input_invalid';
  end if;
  select module.course_id into v_course_id
    from public.course_lessons lesson
    join public.course_modules module on module.id = lesson.module_id
   where lesson.id = p_lesson_id;
  if not found or not exists(
    select 1 from public.course_enrollments enrollment
     where enrollment.user_id = p_actor_id and enrollment.course_id = v_course_id
  ) then
    raise exception using errcode = '42501', message = 'learning_enrollment_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learning-progress:' || p_actor_id::text || ':' || v_course_id::text, 0));
  select * into v_progress
    from public.lesson_progress
   where user_id = p_actor_id and lesson_id = p_lesson_id
   for update;
  if found then v_was_completed := v_progress.completed_at is not null; end if;

  if not found and not p_completed then
    select coalesce(progress.percent, 0) into v_percent
      from public.course_progress progress
     where progress.user_id = p_actor_id and progress.course_id = v_course_id;
    return jsonb_build_object('outcome', 'unchanged', 'percent', coalesce(v_percent, 0));
  end if;
  if found and v_was_completed = p_completed then
    select coalesce(progress.percent, 0) into v_percent
      from public.course_progress progress
     where progress.user_id = p_actor_id and progress.course_id = v_course_id;
    return jsonb_build_object('outcome', 'unchanged', 'percent', coalesce(v_percent, 0));
  end if;

  insert into public.lesson_progress(user_id, lesson_id, completed_at)
  values (p_actor_id, p_lesson_id, case when p_completed then now() else null end)
  on conflict(user_id, lesson_id) do update
    set completed_at = excluded.completed_at;

  select count(*) into v_total
    from public.course_lessons lesson
    join public.course_modules module on module.id = lesson.module_id
   where module.course_id = v_course_id;
  select count(*) into v_completed
    from public.lesson_progress progress
    join public.course_lessons lesson on lesson.id = progress.lesson_id
    join public.course_modules module on module.id = lesson.module_id
   where progress.user_id = p_actor_id and module.course_id = v_course_id
     and progress.completed_at is not null;
  v_percent := case when v_total > 0 then round(v_completed::numeric * 100 / v_total, 2) else 0 end;

  insert into public.course_progress(user_id, course_id, percent, last_lesson_id, updated_at)
  values (p_actor_id, v_course_id, v_percent, p_lesson_id, now())
  on conflict(user_id, course_id) do update
    set percent = excluded.percent,
        last_lesson_id = excluded.last_lesson_id,
        updated_at = excluded.updated_at;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    case when p_completed then 'learning.lesson_completed' else 'learning.lesson_reopened' end,
    'lesson',
    p_lesson_id::text,
    jsonb_build_object('courseId', v_course_id, 'percent', v_percent, 'completedCount', v_completed, 'lessonCount', v_total)
  );
  return jsonb_build_object(
    'outcome', case when p_completed then 'completed' else 'reopened' end,
    'percent', v_percent, 'completedCount', v_completed, 'lessonCount', v_total
  );
end $$;

create or replace function public.save_customer_course_note(
  p_actor_id uuid,
  p_lesson_id uuid,
  p_content text,
  p_note_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_note public.course_notes%rowtype;
  v_content text := btrim(coalesce(p_content, ''));
  v_created boolean := p_note_id is null;
begin
  if char_length(v_content) not between 1 and 5000
     or regexp_replace(v_content, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'learning_note_invalid';
  end if;
  select module.course_id into v_course_id
    from public.course_lessons lesson
    join public.course_modules module on module.id = lesson.module_id
   where lesson.id = p_lesson_id;
  if not found or not exists(
    select 1 from public.course_enrollments enrollment
     where enrollment.user_id = p_actor_id and enrollment.course_id = v_course_id
  ) then
    raise exception using errcode = '42501', message = 'learning_enrollment_required';
  end if;

  if p_note_id is null then
    insert into public.course_notes(user_id, lesson_id, content)
    values (p_actor_id, p_lesson_id, v_content)
    returning * into v_note;
  else
    select * into v_note
      from public.course_notes
     where id = p_note_id and user_id = p_actor_id and lesson_id = p_lesson_id
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'learning_note_not_found'; end if;
    if v_note.content = v_content then
      return jsonb_build_object('outcome', 'unchanged', 'noteId', v_note.id, 'updatedAt', v_note.updated_at);
    end if;
    update public.course_notes set content = v_content where id = v_note.id returning * into v_note;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    case when v_created then 'learning.note_created' else 'learning.note_updated' end,
    'course_note',
    v_note.id::text,
    jsonb_build_object('courseId', v_course_id, 'lessonId', p_lesson_id, 'contentLength', char_length(v_content))
  );
  return jsonb_build_object(
    'outcome', case when v_created then 'created' else 'updated' end,
    'noteId', v_note.id, 'updatedAt', v_note.updated_at
  );
end $$;

create or replace function public.delete_customer_course_note(
  p_actor_id uuid,
  p_note_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note public.course_notes%rowtype;
  v_course_id uuid;
begin
  select note.* into v_note
    from public.course_notes note
   where note.id = p_note_id and note.user_id = p_actor_id
   for update;
  if not found then
    return jsonb_build_object('outcome', 'already_deleted');
  end if;
  select module.course_id into v_course_id
    from public.course_lessons lesson
    join public.course_modules module on module.id = lesson.module_id
   where lesson.id = v_note.lesson_id;
  delete from public.course_notes where id = v_note.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'learning.note_deleted', 'course_note', v_note.id::text,
    jsonb_build_object('courseId', v_course_id, 'lessonId', v_note.lesson_id, 'contentLength', char_length(v_note.content))
  );
  return jsonb_build_object('outcome', 'deleted');
end $$;

revoke all on function public.set_customer_lesson_completion(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.save_customer_course_note(uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.delete_customer_course_note(uuid,uuid) from public, anon, authenticated;
grant execute on function public.set_customer_lesson_completion(uuid,uuid,boolean) to service_role;
grant execute on function public.save_customer_course_note(uuid,uuid,text,uuid) to service_role;
grant execute on function public.delete_customer_course_note(uuid,uuid) to service_role;

comment on function public.set_customer_lesson_completion(uuid,uuid,boolean) is
  'Service-only enrollment-bound lesson toggle with locked, recomputed course progress and metadata-only audit.';
comment on function public.save_customer_course_note(uuid,uuid,text,uuid) is
  'Service-only enrollment-bound private note create/update with content-free audit metadata.';
comment on function public.delete_customer_course_note(uuid,uuid) is
  'Service-only idempotent deletion of the current customer private note with content-free audit metadata.';

-- Rollback-by-forward-fix: preserve learning state and audit history. Replace
-- these functions in a later migration; never restore browser-direct progress
-- or note writes.
