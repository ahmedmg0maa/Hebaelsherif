-- 052: versioned, non-diagnostic guided assessment with atomic Admin publication.
-- LOCAL ONLY. Apply after 051 on authorized Staging. Answers remain browser-only.
-- Rollback is forward-only: archive versions and remove consumers; retain audit history.

insert into public.admin_permissions (role, permission)
values ('admin', 'assessments.manage'), ('content', 'assessments.manage'), ('marketing', 'assessments.manage')
on conflict (role, permission) do nothing;

create table if not exists public.guided_assessments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = 'start-here'),
  name text not null check (char_length(name) between 3 and 120),
  published_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guided_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.guided_assessments(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  content jsonb not null,
  publish_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, version)
);

alter table public.guided_assessments
  drop constraint if exists guided_assessments_published_version_id_fkey;
alter table public.guided_assessments
  add constraint guided_assessments_published_version_id_fkey
  foreign key (published_version_id) references public.guided_assessment_versions(id) on delete set null;

drop trigger if exists guided_assessments_updated on public.guided_assessments;
create trigger guided_assessments_updated before update on public.guided_assessments
for each row execute function public.set_updated_at();
drop trigger if exists guided_assessment_versions_updated on public.guided_assessment_versions;
create trigger guided_assessment_versions_updated before update on public.guided_assessment_versions
for each row execute function public.set_updated_at();

create index if not exists guided_assessment_versions_status_idx
  on public.guided_assessment_versions (status, publish_at, assessment_id, version desc);

create or replace function public.guided_assessment_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  v_question jsonb; v_option jsonb; v_result jsonb;
  v_question_keys text[] := '{}'; v_option_keys text[]; v_result_keys text[] := '{}';
  v_mapped_keys text[] := '{}'; v_key text; v_target text; v_weight text;
begin
  if jsonb_typeof(p_content) <> 'object'
     or char_length(btrim(coalesce(p_content->>'eyebrow',''))) not between 2 and 80
     or char_length(btrim(coalesce(p_content->>'heading',''))) not between 4 and 140
     or char_length(btrim(coalesce(p_content->>'lead',''))) not between 12 and 400
     or char_length(btrim(coalesce(p_content->>'disclaimer',''))) not between 20 and 500
     or jsonb_typeof(p_content->'questions') <> 'array'
     or jsonb_array_length(p_content->'questions') not between 2 and 6
     or jsonb_typeof(p_content->'results') <> 'array'
     or jsonb_array_length(p_content->'results') not between 2 and 5 then return false;
  end if;
  for v_result in select value from jsonb_array_elements(p_content->'results') loop
    v_key := btrim(coalesce(v_result->>'key','')); v_target := coalesce(v_result->>'target','');
    if v_key !~ '^[a-z][a-z0-9_]{1,39}$' or v_key = any(v_result_keys)
       or char_length(btrim(coalesce(v_result->>'title',''))) not between 4 and 160
       or char_length(btrim(coalesce(v_result->>'explanation',''))) not between 20 and 500
       or char_length(btrim(coalesce(v_result->>'rationale',''))) not between 12 and 320
       or char_length(btrim(coalesce(v_result->>'cta',''))) not between 2 and 80
       or v_target not in ('/booking','/courses','/books','/workshops','/articles','/resources') then return false;
    end if;
    v_result_keys := array_append(v_result_keys, v_key);
  end loop;
  for v_question in select value from jsonb_array_elements(p_content->'questions') loop
    v_key := btrim(coalesce(v_question->>'key','')); v_option_keys := '{}';
    if v_key !~ '^[a-z][a-z0-9_]{1,39}$' or v_key = any(v_question_keys)
       or char_length(btrim(coalesce(v_question->>'title',''))) not between 4 and 180
       or char_length(btrim(coalesce(v_question->>'help',''))) > 240
       or jsonb_typeof(v_question->'options') <> 'array'
       or jsonb_array_length(v_question->'options') not between 2 and 6 then return false;
    end if;
    v_question_keys := array_append(v_question_keys, v_key);
    for v_option in select value from jsonb_array_elements(v_question->'options') loop
      v_key := btrim(coalesce(v_option->>'key','')); v_weight := coalesce(v_option->>'weight','');
      if v_key !~ '^[a-z][a-z0-9_]{1,39}$' or v_key = any(v_option_keys)
         or char_length(btrim(coalesce(v_option->>'label',''))) not between 3 and 140
         or not (coalesce(v_option->>'resultKey','') = any(v_result_keys))
         or v_weight !~ '^[1-3]$' then return false;
      end if;
      v_option_keys := array_append(v_option_keys, v_key);
      v_mapped_keys := array_append(v_mapped_keys, v_option->>'resultKey');
    end loop;
  end loop;
  return (select bool_and(key = any(v_mapped_keys)) from unnest(v_result_keys) key);
exception when others then return false;
end $$;

alter table public.guided_assessments enable row level security;
alter table public.guided_assessment_versions enable row level security;
create policy "guided assessments: published pointer or manager" on public.guided_assessments for select
using (published_version_id is not null or public.has_permission('assessments.manage'));
create policy "guided assessment versions: current published or manager" on public.guided_assessment_versions for select
using (public.has_permission('assessments.manage') or exists (
  select 1 from public.guided_assessments assessment
  where assessment.id = assessment_id and assessment.published_version_id = guided_assessment_versions.id
    and status = 'published' and coalesce(publish_at, published_at, now()) <= now()
));
revoke insert, update, delete on public.guided_assessments from anon, authenticated;
revoke insert, update, delete on public.guided_assessment_versions from anon, authenticated;

create or replace function public.save_guided_assessment_version(
  p_assessment_id uuid, p_version_id uuid, p_actor_id uuid, p_name text,
  p_content jsonb, p_status text, p_publish_at timestamptz
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_assessment_id uuid; v_version_id uuid; v_version integer; v_existing_status text; v_name text := btrim(coalesce(p_name,''));
begin
  if not public.has_permission('assessments.manage', p_actor_id) then raise exception using errcode='42501',message='assessment_permission_required'; end if;
  if char_length(v_name) not between 3 and 120 or not public.guided_assessment_content_valid(p_content)
     or p_status not in ('draft','scheduled','published')
     or (p_status='scheduled' and (p_publish_at is null or p_publish_at<=now())) then
    raise exception using errcode='22023',message='invalid_assessment';
  end if;
  if p_assessment_id is null then
    insert into public.guided_assessments(slug,name,created_by,updated_by)
    values('start-here',v_name,p_actor_id,p_actor_id) returning id into v_assessment_id;
  else
    select id into v_assessment_id from public.guided_assessments where id=p_assessment_id for update;
    if not found then raise exception using errcode='P0002',message='assessment_not_found'; end if;
    update public.guided_assessments set name=v_name,updated_by=p_actor_id where id=v_assessment_id;
  end if;
  if p_version_id is null then
    select coalesce(max(version),0)+1 into v_version from public.guided_assessment_versions where assessment_id=v_assessment_id;
    insert into public.guided_assessment_versions(assessment_id,version,status,content,publish_at,published_at,created_by,updated_by)
    values(v_assessment_id,v_version,p_status,p_content,case when p_status='scheduled' then p_publish_at end,case when p_status='published' then now() end,p_actor_id,p_actor_id)
    returning id into v_version_id;
  else
    select status,version into v_existing_status,v_version from public.guided_assessment_versions where id=p_version_id and assessment_id=v_assessment_id for update;
    if not found then raise exception using errcode='P0002',message='assessment_version_not_found'; end if;
    if v_existing_status not in ('draft','scheduled') then raise exception using errcode='22023',message='assessment_version_immutable'; end if;
    update public.guided_assessment_versions set status=p_status,content=p_content,publish_at=case when p_status='scheduled' then p_publish_at end,
      published_at=case when p_status='published' then now() end,updated_by=p_actor_id where id=p_version_id returning id into v_version_id;
  end if;
  if p_status='published' then
    update public.guided_assessment_versions set status='archived',updated_by=p_actor_id
      where assessment_id=v_assessment_id and id<>v_version_id and status='published';
    update public.guided_assessments set published_version_id=v_version_id,updated_by=p_actor_id where id=v_assessment_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(
    p_actor_id,case when p_status='published' then 'assessment.published' when p_version_id is null then 'assessment.version_created' else 'assessment.version_updated' end,
    'guided_assessment',v_assessment_id::text,jsonb_build_object('version',v_version,'status',p_status,'questions',jsonb_array_length(p_content->'questions'),'results',jsonb_array_length(p_content->'results')));
  return v_version_id;
exception when unique_violation then raise exception using errcode='23505',message='start_here_assessment_exists';
end $$;

create or replace function public.delete_guided_assessment_draft(p_version_id uuid,p_actor_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_row public.guided_assessment_versions%rowtype;
begin
  if not public.has_permission('assessments.manage',p_actor_id) then raise exception using errcode='42501',message='assessment_permission_required';end if;
  select * into v_row from public.guided_assessment_versions where id=p_version_id for update;
  if not found then raise exception using errcode='P0002',message='assessment_version_not_found';end if;
  if v_row.status not in ('draft','scheduled') then raise exception using errcode='22023',message='only_draft_assessment_deletable';end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'assessment.version_deleted','guided_assessment',v_row.assessment_id::text,jsonb_build_object('version',v_row.version,'previousStatus',v_row.status));
  delete from public.guided_assessment_versions where id=p_version_id;
  if not exists(select 1 from public.guided_assessment_versions where assessment_id=v_row.assessment_id) then delete from public.guided_assessments where id=v_row.assessment_id and published_version_id is null;end if;
  return true;
end $$;

create or replace function public.publish_scheduled_guided_assessments()
returns integer language plpgsql security definer set search_path=public as $$
declare v_row record;v_count integer:=0;
begin
  for v_row in select id,assessment_id,updated_by from public.guided_assessment_versions where status='scheduled' and publish_at<=now() order by publish_at,version for update loop
    update public.guided_assessment_versions set status='archived',updated_by=v_row.updated_by where assessment_id=v_row.assessment_id and id<>v_row.id and status='published';
    update public.guided_assessment_versions set status='published',published_at=now() where id=v_row.id;
    update public.guided_assessments set published_version_id=v_row.id,updated_by=v_row.updated_by where id=v_row.assessment_id;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_row.updated_by,'assessment.scheduled_published','guided_assessment',v_row.assessment_id::text,jsonb_build_object('versionId',v_row.id));
    v_count:=v_count+1;
  end loop;return v_count;
end $$;

revoke all on function public.guided_assessment_content_valid(jsonb) from public,anon,authenticated;grant execute on function public.guided_assessment_content_valid(jsonb) to service_role;
revoke all on function public.save_guided_assessment_version(uuid,uuid,uuid,text,jsonb,text,timestamptz) from public,anon,authenticated;grant execute on function public.save_guided_assessment_version(uuid,uuid,uuid,text,jsonb,text,timestamptz) to service_role;
revoke all on function public.delete_guided_assessment_draft(uuid,uuid) from public,anon,authenticated;grant execute on function public.delete_guided_assessment_draft(uuid,uuid) to service_role;
revoke all on function public.publish_scheduled_guided_assessments() from public,anon,authenticated;grant execute on function public.publish_scheduled_guided_assessments() to service_role;

do $$ begin if exists(select 1 from pg_extension where extname='pg_cron') then perform cron.unschedule(jobid) from cron.job where jobname='publish-scheduled-guided-assessments';perform cron.schedule('publish-scheduled-guided-assessments','*/5 * * * *','select public.publish_scheduled_guided_assessments()');end if;exception when others then null;end $$;

comment on table public.guided_assessment_versions is 'Immutable published assessment versions. Customer answers are intentionally never stored.';
