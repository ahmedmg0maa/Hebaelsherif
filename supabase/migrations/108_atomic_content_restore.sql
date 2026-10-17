-- Additive. Review and test in isolation before production; restores no content.
alter table public.pages add column row_version bigint not null default 1;
alter table public.page_sections add column row_version bigint not null default 1;
alter table public.articles add column row_version bigint not null default 1;
create function public.advance_cms_row_version() returns trigger language plpgsql set search_path='' as $$
begin new.row_version:=old.row_version+1;return new;end $$;
revoke all on function public.advance_cms_row_version() from public,anon,authenticated,service_role;
create trigger pages_row_version before update on public.pages for each row execute function public.advance_cms_row_version();
create trigger sections_row_version before update on public.page_sections for each row execute function public.advance_cms_row_version();
create trigger articles_row_version before update on public.articles for each row execute function public.advance_cms_row_version();

create function public.cms_restore_url_valid(v text) returns boolean language sql immutable set search_path='' as $$
 select v is null or v='' or (length(v)<=500 and v !~ '[[:space:]\\]' and (v ~ '^https://[^/]' or (v='/' or (v ~ '^/[^/]' and v !~* '%(2f|5c|0[0-9a-f]|1[0-9a-f]|7f)'))))
$$;
create function public.cms_restore_content_valid(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare pair record;item jsonb;
begin
 if v is null or octet_length(v::text)>65536 or v::text ~* '(javascript:|data:text/html|<script)' then return false;end if;
 if jsonb_typeof(v)='object' then
  for pair in select * from jsonb_each(v) loop
   if pair.key ~* '(href|url|link)$' and jsonb_typeof(pair.value)='string' and not public.cms_restore_url_valid(pair.value#>>'{}') then return false;end if;
   if jsonb_typeof(pair.value) in ('object','array') and not public.cms_restore_content_valid(pair.value) then return false;end if;
  end loop;
 elsif jsonb_typeof(v)='array' then
  for item in select value from jsonb_array_elements(v) loop
   if jsonb_typeof(item) in ('object','array') and not public.cms_restore_content_valid(item) then return false;end if;
  end loop;
 end if;return true;
end $$;
revoke all on function public.cms_restore_url_valid(text),public.cms_restore_content_valid(jsonb) from public,anon,authenticated;

create function public.admin_content_restore_context(p_actor_id uuid,p_revision_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.content_revisions%rowtype;current_row jsonb;
begin
 if p_actor_id is null or not public.has_permission('content.publish',p_actor_id) then raise exception using errcode='42501',message='content_publish_required';end if;
 select * into r from public.content_revisions where id=p_revision_id;
 if not found or r.entity_type not in ('page','page_section','article') then raise exception using errcode='P0002',message='content_revision_not_found';end if;
 case r.entity_type
  when 'page' then select to_jsonb(p) into current_row from public.pages p where id=r.entity_id;
  when 'page_section' then select to_jsonb(s) into current_row from public.page_sections s where id=r.entity_id;
  when 'article' then select to_jsonb(a) into current_row from public.articles a where id=r.entity_id;
 end case;
 if current_row is null then raise exception using errcode='P0002',message='content_entity_missing';end if;
 return jsonb_build_object('version',(current_row->>'row_version')::bigint,'title',coalesce(current_row->>'title',current_row->>'name'),'kind',r.entity_type);
end $$;

create function public.restore_content_revision_atomic(p_actor_id uuid,p_revision_id uuid,p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.content_revisions%rowtype;current_row jsonb;s jsonb;v_page public.pages%rowtype;
 v_section public.page_sections%rowtype;v_article public.articles%rowtype;checkpoint uuid;old_slug text;new_slug text;
begin
 if p_actor_id is null or not public.has_permission('content.publish',p_actor_id) or not public.has_permission('content.manage',p_actor_id) then raise exception using errcode='42501',message='content_publish_required';end if;
 if p_expected_version is null or p_expected_version<1 then raise exception using errcode='22023',message='content_version_required';end if;
 select * into r from public.content_revisions where id=p_revision_id for share;
 if not found or r.entity_type not in ('page','page_section','article') then raise exception using errcode='P0002',message='content_revision_not_found';end if;
 s:=r.snapshot;
 if jsonb_typeof(s) is distinct from 'object' then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
 case r.entity_type
 when 'page' then
  select * into v_page from public.pages where id=r.entity_id for update;
  if not found then raise exception using errcode='P0002',message='content_entity_missing';end if;
  current_row:=to_jsonb(v_page);old_slug:=v_page.slug;new_slug:=old_slug;
 when 'page_section' then
  -- Same parent-before-section lock order as the governed editor.
  select p.* into v_page from public.pages p join public.page_sections x on x.page_id=p.id where x.id=r.entity_id for update of p;
  if not found then raise exception using errcode='P0002',message='content_entity_missing';end if;
  select * into v_section from public.page_sections where id=r.entity_id for update;
  if not found then raise exception using errcode='P0002',message='content_entity_missing';end if;
  if v_page.slug='home' and v_page.is_published and v_section.kind in ('hero','pathways','cta') then raise exception using errcode='23514',message='published_home_required_section';end if;
  current_row:=to_jsonb(v_section);old_slug:=v_page.slug;new_slug:=old_slug;
 when 'article' then
  select * into v_article from public.articles where id=r.entity_id for update;
  if not found then raise exception using errcode='P0002',message='content_entity_missing';end if;
  current_row:=to_jsonb(v_article);old_slug:=v_article.slug;new_slug:=s->>'slug';
 end case;
 if (current_row->>'row_version')::bigint<>p_expected_version then raise exception using errcode='40001',message='content_version_conflict';end if;
 -- Do not restore identity, ownership, permissions or publication flags.
 if r.entity_type in ('page','article') and (char_length(btrim(coalesce(s->>'title',''))) not between 3 and 160
  or char_length(coalesce(s->>'seo_title',''))>70 or char_length(coalesce(s->>'seo_description',''))>180
  or not public.cms_restore_url_valid(s->>'canonical_url') or not public.cms_restore_url_valid(s->>'og_image_url')) then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
 insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) values(r.entity_type,r.entity_id,current_row,p_actor_id) returning id into checkpoint;
 if r.entity_type='page' then
  if char_length(coalesce(s->>'legal_version',''))>40 then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
  update public.pages set title=btrim(s->>'title'),seo_title=s->>'seo_title',seo_description=s->>'seo_description',canonical_url=nullif(s->>'canonical_url',''),og_image_url=nullif(s->>'og_image_url',''),status='draft',is_published=false,publish_at=null,revision=revision+1,
   legal_review_status=case when s->>'legal_review_status'='approved' then 'pending' when s->>'legal_review_status' in ('draft','pending','not_applicable') then s->>'legal_review_status' else 'not_applicable' end,
   legal_version=s->>'legal_version',effective_at=(s->>'effective_at')::date where id=r.entity_id;
 elsif r.entity_type='article' then
  if new_slug is null or char_length(new_slug) not between 3 and 80 or new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(coalesce(s->>'excerpt',''))>500 or char_length(coalesce(s->>'content',''))>100000 or not public.cms_restore_url_valid(s->>'cover_url') then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
  update public.articles set title=btrim(s->>'title'),slug=new_slug,excerpt=coalesce(s->>'excerpt',''),content=coalesce(s->>'content',''),cover_url=nullif(s->>'cover_url',''),canonical_url=nullif(s->>'canonical_url',''),og_image_url=nullif(s->>'og_image_url',''),seo_title=s->>'seo_title',seo_description=s->>'seo_description',status='draft',is_published=false,publish_at=null where id=r.entity_id;
  -- An old URL cannot inherit readiness evidence for a different cover.
  if v_article.cover_url is distinct from nullif(s->>'cover_url','') then delete from public.media_usages where entity_type='article' and entity_id=r.entity_id::text and field='cover_url';end if;
 else
  if char_length(btrim(coalesce(s->>'name',''))) not between 2 and 100 or s->>'kind' not in ('hero','intro','trust','manifesto','quote','pathways','guided_start','editorial_feature','featured_services','books','courses','workshops','availability_preview','offer','testimonials','press','articles','resources','newsletter','cta','rich_text')
   or coalesce((s->>'sort')::integer,-1) not between 0 and 1000 or jsonb_typeof(s->'content') is distinct from 'object' or not public.cms_restore_content_valid(s->'content') then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
  if v_page.slug='home' and (v_section.kind<>s->>'kind' or not public.master_v2_home_content_valid(s->>'kind',s->'content')) then raise exception using errcode='22023',message='content_snapshot_invalid';end if;
  update public.page_sections set name=btrim(s->>'name'),kind=s->>'kind',sort=(s->>'sort')::integer,content=s->'content',is_visible=false,revision=revision+1 where id=r.entity_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'content_revision.restored_as_draft',r.entity_type,r.entity_id::text,jsonb_build_object('revision_id',r.id,'checkpoint_id',checkpoint,'from_version',p_expected_version,'to_version',p_expected_version+1));
 return jsonb_build_object('id',r.entity_id,'version',p_expected_version+1,'previousSlug',old_slug,'slug',new_slug,'kind',r.entity_type);
end $$;
revoke all on function public.admin_content_restore_context(uuid,uuid),public.restore_content_revision_atomic(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.admin_content_restore_context(uuid,uuid),public.restore_content_revision_atomic(uuid,uuid,bigint) to service_role;
