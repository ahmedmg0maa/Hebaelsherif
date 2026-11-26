-- 021: metadata-rich media library, usage registry, and private-row protection
alter table public.media_assets
  add column if not exists title text not null default '',
  add column if not exists original_name text,
  add column if not exists mime_type text,
  add column if not exists width integer check (width is null or width > 0),
  add column if not exists height integer check (height is null or height > 0),
  add column if not exists tags text[] not null default '{}',
  add column if not exists visibility text not null default 'private' check (visibility in ('public','private')),
  add column if not exists updated_at timestamptz not null default now();

update public.media_assets
set visibility = case when bucket = 'public-media' then 'public' else 'private' end,
    title = coalesce(nullif(title, ''), nullif(alt, ''), regexp_replace(path, '^.*/', '')),
    mime_type = coalesce(mime_type, case kind when 'image' then 'image/*' when 'video' then 'video/*' when 'audio' then 'audio/*' else 'application/octet-stream' end);

drop trigger if exists media_assets_updated on public.media_assets;
create trigger media_assets_updated before update on public.media_assets
  for each row execute function public.set_updated_at();

create index if not exists media_assets_created_idx on public.media_assets(created_at desc);
create index if not exists media_assets_bucket_kind_idx on public.media_assets(bucket, kind);
create index if not exists media_assets_tags_idx on public.media_assets using gin(tags);

create table if not exists public.media_usages (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  entity_type text not null,
  entity_id text not null,
  field text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(asset_id, entity_type, entity_id, field)
);
create index if not exists media_usages_asset_idx on public.media_usages(asset_id);
alter table public.media_usages enable row level security;
create policy "media_usages: permitted read" on public.media_usages for select using (public.has_permission('media.view'));
create policy "media_usages: permitted write" on public.media_usages for all using (public.has_permission('media.manage')) with check (public.has_permission('media.manage'));

drop policy if exists "media: public read" on public.media_assets;
create policy "media: public or permitted read" on public.media_assets for select
  using (visibility = 'public' or public.has_permission('media.view'));
