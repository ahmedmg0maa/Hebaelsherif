-- 036: structured CMS publishing, preview tokens, navigation and scheduled release.
alter table public.pages
  add column if not exists status text not null default 'published' check(status in ('draft','scheduled','published','archived')),
  add column if not exists publish_at timestamptz,
  add column if not exists canonical_url text,
  add column if not exists og_image_url text,
  add column if not exists revision int not null default 1;
update public.pages set status=case when is_published then 'published' else 'draft' end;
alter table public.page_sections add column if not exists name text not null default '',add column if not exists revision int not null default 1;
alter table public.articles add column if not exists status text not null default 'draft' check(status in ('draft','scheduled','published','archived')),add column if not exists publish_at timestamptz,add column if not exists canonical_url text,add column if not exists og_image_url text;
update public.articles set status=case when is_published then 'published' else 'draft' end,publish_at=published_at where status='draft';

create table if not exists public.content_preview_tokens(
  id uuid primary key default gen_random_uuid(),entity_type text not null check(entity_type in ('page','article')),entity_id uuid not null,
  token_hash text not null unique,expires_at timestamptz not null,created_by uuid references auth.users(id) on delete set null,used_at timestamptz,created_at timestamptz not null default now()
);
alter table public.content_preview_tokens enable row level security;
create policy "preview tokens: content manage" on public.content_preview_tokens for all using(public.has_permission('content.manage')) with check(public.has_permission('content.manage'));

create or replace function public.publish_scheduled_content()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pages int;v_articles int;
begin
  update public.pages set status='published',is_published=true,revision=revision+1 where status='scheduled' and publish_at<=now();get diagnostics v_pages=row_count;
  update public.articles set status='published',is_published=true,published_at=coalesce(published_at,now()) where status='scheduled' and publish_at<=now();get diagnostics v_articles=row_count;
  return jsonb_build_object('pages',v_pages,'articles',v_articles);
end $$;
revoke all on function public.publish_scheduled_content() from public,anon,authenticated;
grant execute on function public.publish_scheduled_content() to service_role;
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='publish-scheduled-content';
    perform cron.schedule('publish-scheduled-content','*/5 * * * *','select public.publish_scheduled_content()');
  end if;
exception when others then null;end $$;
