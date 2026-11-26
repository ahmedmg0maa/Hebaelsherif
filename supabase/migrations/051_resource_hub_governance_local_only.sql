-- 051: governed public Resource Hub with accessible media metadata, scheduling and atomic Admin CRUD.
-- LOCAL ONLY. Apply after 050 on authorized Staging. Rollback is forward-only:
-- archive public rows and remove consumers while retaining source/audit history.

insert into public.admin_permissions (role, permission)
values ('admin', 'resources.manage'), ('content', 'resources.manage'), ('marketing', 'resources.manage')
on conflict (role, permission) do nothing;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  excerpt text not null,
  body text not null default '',
  kind text not null check (kind in ('article', 'video', 'podcast')),
  topic text not null,
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440),
  external_url text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  transcript text not null default '',
  captions text not null default '',
  related_product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_at timestamptz,
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_external_https check (external_url is null or external_url ~ '^https://[^[:space:]]+$'),
  constraint resources_text_lengths check (
    char_length(title) between 4 and 180 and char_length(excerpt) between 20 and 500
    and char_length(topic) between 2 and 80 and char_length(body) <= 30000
    and char_length(transcript) <= 30000 and char_length(captions) <= 30000
  )
);

drop trigger if exists resources_updated on public.resources;
create trigger resources_updated before update on public.resources for each row execute function public.set_updated_at();
create index if not exists resources_public_idx on public.resources (is_featured desc, publish_at desc, created_at desc) where status = 'published';
create index if not exists resources_topic_kind_idx on public.resources (topic, kind, duration_minutes);

alter table public.resources enable row level security;
create policy "resources: published public or manager" on public.resources for select
using ((status = 'published' and coalesce(publish_at, now()) <= now()) or public.has_permission('resources.manage'));
revoke insert, update, delete on table public.resources from anon, authenticated;

create or replace function public.save_resource(
  p_id uuid, p_actor_id uuid, p_slug text, p_title text, p_excerpt text, p_body text,
  p_kind text, p_topic text, p_duration_minutes integer, p_external_url text,
  p_media_asset_id uuid, p_transcript text, p_captions text, p_related_product_id uuid,
  p_status text, p_publish_at timestamptz, p_is_featured boolean,
  p_seo_title text, p_seo_description text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_excerpt text := btrim(coalesce(p_excerpt, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_topic text := btrim(coalesce(p_topic, ''));
  v_url text := nullif(btrim(coalesce(p_external_url, '')), '');
  v_transcript text := btrim(coalesce(p_transcript, ''));
  v_captions text := btrim(coalesce(p_captions, ''));
begin
  if not public.has_permission('resources.manage', p_actor_id) then raise exception using errcode='42501',message='resources_permission_required'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) > 100
     or char_length(v_title) not between 4 and 180 or char_length(v_excerpt) not between 20 and 500
     or char_length(v_body) > 30000 or p_kind not in ('article','video','podcast')
     or char_length(v_topic) not between 2 and 80 or p_duration_minutes not between 0 and 1440
     or (v_url is not null and v_url !~ '^https://[^[:space:]]+$')
     or char_length(v_transcript) > 30000 or char_length(v_captions) > 30000
     or p_status not in ('draft','scheduled','published','archived')
     or (p_status='scheduled' and (p_publish_at is null or p_publish_at<=now())) then
    raise exception using errcode='22023',message='invalid_resource';
  end if;
  if p_status in ('published','scheduled') and p_kind='article' and char_length(v_body)<50 then raise exception using errcode='22023',message='resource_article_body_required'; end if;
  if p_status in ('published','scheduled') and p_kind in ('video','podcast') and (p_duration_minutes<1 or (v_url is null and p_media_asset_id is null)) then raise exception using errcode='22023',message='resource_media_required'; end if;
  if p_status in ('published','scheduled') and p_kind in ('video','podcast') and char_length(v_transcript)<20 and char_length(v_captions)<20 then raise exception using errcode='22023',message='resource_accessibility_text_required'; end if;
  if p_status in ('published','scheduled') and p_media_asset_id is not null and not exists (
    select 1 from public.media_assets m where m.id=p_media_asset_id and m.visibility='public' and m.bucket='public-media'
      and m.rights_status in ('owned','licensed','public_domain') and m.rights_reference<>''
  ) then raise exception using errcode='22023',message='resource_media_rights_required'; end if;
  if p_related_product_id is not null and p_status in ('published','scheduled') and not exists (
    select 1 from public.products p where p.id=p_related_product_id and p.is_published
  ) then raise exception using errcode='22023',message='resource_related_product_unpublished'; end if;

  if p_id is null then
    insert into public.resources(slug,title,excerpt,body,kind,topic,duration_minutes,external_url,media_asset_id,transcript,captions,related_product_id,status,publish_at,is_featured,seo_title,seo_description,created_by,updated_by)
    values(v_slug,v_title,v_excerpt,v_body,p_kind,v_topic,p_duration_minutes,v_url,p_media_asset_id,v_transcript,v_captions,p_related_product_id,p_status,p_publish_at,p_is_featured,nullif(btrim(coalesce(p_seo_title,'')),''),nullif(btrim(coalesce(p_seo_description,'')),''),p_actor_id,p_actor_id)
    returning id into v_id;
  else
    update public.resources set slug=v_slug,title=v_title,excerpt=v_excerpt,body=v_body,kind=p_kind,topic=v_topic,duration_minutes=p_duration_minutes,
      external_url=v_url,media_asset_id=p_media_asset_id,transcript=v_transcript,captions=v_captions,related_product_id=p_related_product_id,
      status=p_status,publish_at=p_publish_at,is_featured=p_is_featured,seo_title=nullif(btrim(coalesce(p_seo_title,'')),''),
      seo_description=nullif(btrim(coalesce(p_seo_description,'')),''),updated_by=p_actor_id where id=p_id returning id into v_id;
    if v_id is null then raise exception using errcode='P0002',message='resource_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(
    p_actor_id,case when p_id is null then 'resource.created' else 'resource.updated' end,'resource',v_id::text,
    jsonb_build_object('kind',p_kind,'status',p_status,'hasMedia',p_media_asset_id is not null,'hasExternalSource',v_url is not null,'hasTranscript',char_length(v_transcript)>=20,'relatedProduct',p_related_product_id is not null)
  );
  return v_id;
exception when unique_violation then raise exception using errcode='23505',message='resource_slug_exists';
end $$;

create or replace function public.delete_resource(p_id uuid,p_actor_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_row public.resources%rowtype;
begin
  if not public.has_permission('resources.manage',p_actor_id) then raise exception using errcode='42501',message='resources_permission_required';end if;
  select * into v_row from public.resources where id=p_id for update;
  if not found then raise exception using errcode='P0002',message='resource_not_found';end if;
  if v_row.status not in ('draft','archived') then raise exception using errcode='22023',message='archive_resource_before_delete';end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'resource.deleted','resource',p_id::text,jsonb_build_object('previousStatus',v_row.status,'kind',v_row.kind,'hadMedia',v_row.media_asset_id is not null));
  delete from public.resources where id=p_id;return true;
end $$;

create or replace function public.publish_scheduled_resources()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;begin update public.resources set status='published' where status='scheduled' and publish_at<=now();get diagnostics v_count=row_count;return v_count;end $$;

revoke all on function public.save_resource(uuid,uuid,text,text,text,text,text,text,integer,text,uuid,text,text,uuid,text,timestamptz,boolean,text,text) from public,anon,authenticated;
grant execute on function public.save_resource(uuid,uuid,text,text,text,text,text,text,integer,text,uuid,text,text,uuid,text,timestamptz,boolean,text,text) to service_role;
revoke all on function public.delete_resource(uuid,uuid) from public,anon,authenticated;grant execute on function public.delete_resource(uuid,uuid) to service_role;
revoke all on function public.publish_scheduled_resources() from public,anon,authenticated;grant execute on function public.publish_scheduled_resources() to service_role;

do $$ begin if exists(select 1 from pg_extension where extname='pg_cron') then perform cron.unschedule(jobid) from cron.job where jobname='publish-scheduled-resources';perform cron.schedule('publish-scheduled-resources','*/5 * * * *','select public.publish_scheduled_resources()');end if;exception when others then null;end $$;

comment on table public.resources is 'Public Resource Hub entries; media and related offers must remain rights-safe and published.';
