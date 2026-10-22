-- 046: media governance metadata and editorial crop hints
-- LOCAL-ONLY: prepared after 044/045. Do not apply outside an explicitly
-- authorised staging change window with backup/recovery evidence.

alter table public.media_assets
  add column if not exists caption text not null default '',
  add column if not exists credit text not null default '',
  add column if not exists rights_status text not null default 'unverified',
  add column if not exists rights_reference text not null default '',
  add column if not exists folder text not null default 'uncategorized',
  add column if not exists focal_x numeric(5,2) not null default 50,
  add column if not exists focal_y numeric(5,2) not null default 50,
  add column if not exists processing_status text not null default 'original';

do $$ begin
  alter table public.media_assets add constraint media_assets_rights_status_check
    check (rights_status in ('unverified','owned','licensed','public_domain'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.media_assets add constraint media_assets_focal_x_check
    check (focal_x between 0 and 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.media_assets add constraint media_assets_focal_y_check
    check (focal_y between 0 and 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.media_assets add constraint media_assets_processing_status_check
    check (processing_status in ('original','processing','ready','failed'));
exception when duplicate_object then null; end $$;

create index if not exists media_assets_folder_idx on public.media_assets(folder, created_at desc);
create index if not exists media_assets_rights_idx on public.media_assets(rights_status, visibility);

comment on column public.media_assets.rights_status is 'Editorial rights evidence state; public placement must not treat unverified as launch-ready.';
comment on column public.media_assets.rights_reference is 'Owner-supplied licence/source reference; never populated by assumption.';
comment on column public.media_assets.focal_x is 'Horizontal focal point percentage used by responsive crops.';
comment on column public.media_assets.focal_y is 'Vertical focal point percentage used by responsive crops.';
