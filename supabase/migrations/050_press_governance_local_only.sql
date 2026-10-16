-- 050: source-linked Press governance with rights-aware publication, scheduling and atomic Admin CRUD.
-- LOCAL ONLY. Apply after 049 on authorized Staging. Rollback is forward-only:
-- archive public rows and remove consumers while retaining source/audit history.

insert into public.admin_permissions (role, permission)
values
  ('admin', 'press.manage'),
  ('content', 'press.manage'),
  ('marketing', 'press.manage')
on conflict (role, permission) do nothing;

create table if not exists public.press_mentions (
  id uuid primary key default gen_random_uuid(),
  outlet text not null,
  title text not null,
  kind text not null check (kind in ('article', 'interview', 'podcast', 'video', 'event')),
  source_classification text not null check (source_classification in ('independent_editorial', 'partner', 'owned_channel', 'event')),
  original_url text not null,
  published_on date not null,
  excerpt text not null default '',
  image_media_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_at timestamptz,
  is_featured boolean not null default false,
  sort integer not null default 100 check (sort between 0 and 10000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint press_original_https check (original_url ~ '^https://[^[:space:]]+$'),
  constraint press_excerpt_length check (char_length(excerpt) <= 500)
);

drop trigger if exists press_mentions_updated on public.press_mentions;
create trigger press_mentions_updated
before update on public.press_mentions
for each row execute function public.set_updated_at();

create index if not exists press_mentions_public_idx
  on public.press_mentions (is_featured desc, published_on desc, sort)
  where status = 'published';

alter table public.press_mentions enable row level security;
create policy "press: published public or manager" on public.press_mentions for select
using (
  (status = 'published' and coalesce(publish_at, now()) <= now())
  or public.has_permission('press.manage')
);
revoke insert, update, delete on table public.press_mentions from anon, authenticated;

create or replace function public.save_press_mention(
  p_id uuid,
  p_actor_id uuid,
  p_outlet text,
  p_title text,
  p_kind text,
  p_source_classification text,
  p_original_url text,
  p_published_on date,
  p_excerpt text,
  p_image_media_id uuid,
  p_status text,
  p_publish_at timestamptz,
  p_is_featured boolean,
  p_sort integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_outlet text := btrim(coalesce(p_outlet, ''));
  v_title text := btrim(coalesce(p_title, ''));
  v_url text := btrim(coalesce(p_original_url, ''));
  v_excerpt text := btrim(coalesce(p_excerpt, ''));
begin
  if not public.has_permission('press.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'press_permission_required';
  end if;
  if char_length(v_outlet) not between 2 and 160
     or char_length(v_title) not between 4 and 240
     or p_kind not in ('article', 'interview', 'podcast', 'video', 'event')
     or p_source_classification not in ('independent_editorial', 'partner', 'owned_channel', 'event')
     or v_url !~ '^https://[^[:space:]]+$'
     or p_published_on is null or p_published_on > current_date
     or char_length(v_excerpt) > 500
     or p_status not in ('draft', 'scheduled', 'published', 'archived')
     or p_sort not between 0 and 10000
     or (p_status = 'scheduled' and (p_publish_at is null or p_publish_at <= now())) then
    raise exception using errcode = '22023', message = 'invalid_press_mention';
  end if;
  if p_status = 'published' and p_source_classification = 'independent_editorial' and p_kind = 'event' then
    raise exception using errcode = '22023', message = 'invalid_press_classification';
  end if;
  if p_image_media_id is not null and not exists (
    select 1 from public.media_assets m
    where m.id = p_image_media_id
      and m.visibility = 'public'
      and m.bucket = 'public-media'
      and m.rights_status in ('owned', 'licensed', 'public_domain')
      and m.rights_reference <> ''
  ) then
    raise exception using errcode = '22023', message = 'press_image_rights_required';
  end if;

  if p_id is null then
    insert into public.press_mentions (
      outlet, title, kind, source_classification, original_url, published_on, excerpt,
      image_media_id, status, publish_at, is_featured, sort, created_by, updated_by
    ) values (
      v_outlet, v_title, p_kind, p_source_classification, v_url, p_published_on, v_excerpt,
      p_image_media_id, p_status, p_publish_at, p_is_featured, p_sort, p_actor_id, p_actor_id
    ) returning id into v_id;
  else
    update public.press_mentions
    set outlet = v_outlet,
        title = v_title,
        kind = p_kind,
        source_classification = p_source_classification,
        original_url = v_url,
        published_on = p_published_on,
        excerpt = v_excerpt,
        image_media_id = p_image_media_id,
        status = p_status,
        publish_at = p_publish_at,
        is_featured = p_is_featured,
        sort = p_sort,
        updated_by = p_actor_id
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception using errcode = 'P0002', message = 'press_mention_not_found'; end if;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    case when p_id is null then 'press.created' else 'press.updated' end,
    'press_mention',
    v_id::text,
    jsonb_build_object(
      'status', p_status,
      'kind', p_kind,
      'classification', p_source_classification,
      'imageRightsChecked', p_image_media_id is not null,
      'featured', p_is_featured
    )
  );
  return v_id;
end;
$$;

create or replace function public.delete_press_mention(p_id uuid, p_actor_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.press_mentions%rowtype;
begin
  if not public.has_permission('press.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'press_permission_required';
  end if;
  select * into v_row from public.press_mentions where id = p_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'press_mention_not_found'; end if;
  if v_row.status not in ('draft', 'archived') then
    raise exception using errcode = '22023', message = 'archive_press_before_delete';
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'press.deleted', 'press_mention', p_id::text,
    jsonb_build_object('previousStatus', v_row.status, 'kind', v_row.kind, 'classification', v_row.source_classification));
  delete from public.press_mentions where id = p_id;
  return true;
end;
$$;

create or replace function public.publish_scheduled_press()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.press_mentions
  set status = 'published'
  where status = 'scheduled' and publish_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.save_press_mention(uuid, uuid, text, text, text, text, text, date, text, uuid, text, timestamptz, boolean, integer) from public, anon, authenticated;
grant execute on function public.save_press_mention(uuid, uuid, text, text, text, text, text, date, text, uuid, text, timestamptz, boolean, integer) to service_role;
revoke all on function public.delete_press_mention(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_press_mention(uuid, uuid) to service_role;
revoke all on function public.publish_scheduled_press() from public, anon, authenticated;
grant execute on function public.publish_scheduled_press() to service_role;

do $$ begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'publish-scheduled-press';
    perform cron.schedule('publish-scheduled-press', '*/5 * * * *', 'select public.publish_scheduled_press()');
  end if;
exception when others then null; end $$;

comment on table public.press_mentions is 'Owner-supplied source-linked media appearances; self-owned sources remain explicitly classified.';
