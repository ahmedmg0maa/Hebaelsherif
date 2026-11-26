-- 077: atomic CMS page lifecycle, revision, publication and scheduler evidence.
-- LOCAL ONLY. Apply after 076 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "pages: permitted write" on public.pages;
revoke insert, update, delete on table public.pages from anon, authenticated;

create or replace function public.manage_cms_page(
  p_actor_id uuid,
  p_action text,
  p_page_id uuid default null,
  p_title text default null,
  p_slug text default null,
  p_seo_title text default null,
  p_seo_description text default null,
  p_canonical_url text default null,
  p_og_image_url text default null,
  p_status text default null,
  p_publish_at timestamptz default null,
  p_legal_review_status text default null,
  p_legal_version text default null,
  p_effective_at date default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.pages%rowtype;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_seo_title text := nullif(btrim(coalesce(p_seo_title, '')), '');
  v_seo_description text := nullif(btrim(coalesce(p_seo_description, '')), '');
  v_canonical text := nullif(btrim(coalesce(p_canonical_url, '')), '');
  v_og_image text := nullif(btrim(coalesce(p_og_image_url, '')), '');
  v_legal_version text := nullif(btrim(coalesce(p_legal_version, '')), '');
  v_count integer;
  v_public_transition boolean;
begin
  if p_actor_id is null or not public.has_permission('content.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'content_management_required';
  end if;
  if p_action is null or p_action not in ('create','update','seo_update') then
    raise exception using errcode = '22023', message = 'cms_page_operation_invalid';
  end if;

  if p_action = 'create' then
    if p_page_id is not null
       or length(v_title) not between 3 and 160
       or v_title ~ '[[:cntrl:]]'
       or length(v_slug) not between 3 and 80
       or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception using errcode = '22023', message = 'cms_page_create_payload_invalid';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('cms-pages', 0));
    select count(*)::integer into v_count from public.pages;
    if v_count >= 200 then raise exception using errcode = '54000', message = 'cms_page_limit_reached'; end if;
    insert into public.pages(title, slug, status, is_published)
    values (v_title, v_slug, 'draft', false)
    returning id into v_id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'page.created', 'page', v_id::text, jsonb_build_object('slug', v_slug, 'status', 'draft'));
    return jsonb_build_object('id', v_id, 'pageSlug', v_slug, 'action', 'page.created');
  end if;

  if p_page_id is null then raise exception using errcode = '22023', message = 'cms_page_identity_required'; end if;
  select * into v_page from public.pages where id = p_page_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'cms_page_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cms-page:' || p_page_id::text, 0));

  if p_action = 'seo_update' then
    if length(coalesce(v_seo_title, '')) > 70
       or length(coalesce(v_seo_description, '')) > 180
       or coalesce(v_seo_title, '') ~ '[[:cntrl:]]'
       or coalesce(v_seo_description, '') ~ '[[:cntrl:]]' then
      raise exception using errcode = '22023', message = 'cms_page_seo_invalid';
    end if;
    insert into public.content_revisions(entity_type, entity_id, snapshot, created_by)
    values ('page', v_page.id, to_jsonb(v_page), p_actor_id);
    update public.pages
       set seo_title = v_seo_title,
           seo_description = v_seo_description,
           revision = v_page.revision + 1
     where id = v_page.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'page.seo_updated', 'page', v_page.id::text,
      jsonb_build_object('hasSeoTitle', v_seo_title is not null, 'hasSeoDescription', v_seo_description is not null));
    return jsonb_build_object('id', v_page.id, 'pageSlug', v_page.slug, 'action', 'page.seo_updated');
  end if;

  if length(v_title) not between 3 and 160
     or v_title ~ '[[:cntrl:]]'
     or p_status is null
     or p_status not in ('draft','scheduled','published','archived')
     or length(coalesce(v_seo_title, '')) > 70
     or length(coalesce(v_seo_description, '')) > 180
     or coalesce(v_seo_title, '') ~ '[[:cntrl:]]'
     or coalesce(v_seo_description, '') ~ '[[:cntrl:]]'
     or length(coalesce(v_canonical, '')) > 500
     or (v_canonical is not null and (left(v_canonical, 8) <> 'https://' or v_canonical ~ '[[:space:]]'))
     or length(coalesce(v_og_image, '')) > 500
     or (v_og_image is not null and (left(v_og_image, 8) <> 'https://' or v_og_image ~ '[[:space:]]'))
     or p_legal_review_status is null
     or p_legal_review_status not in ('not_applicable','draft','pending','approved')
     or length(coalesce(v_legal_version, '')) > 40
     or coalesce(v_legal_version, '') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'cms_page_payload_invalid';
  end if;
  if p_status = 'scheduled' and (p_publish_at is null or p_publish_at <= now()) then
    raise exception using errcode = '22023', message = 'scheduled_publish_time_invalid';
  end if;

  v_public_transition := p_status in ('scheduled','published') or v_page.status in ('scheduled','published');
  if v_public_transition and not public.has_permission('content.publish', p_actor_id) then
    raise exception using errcode = '42501', message = 'content_publish_required';
  end if;
  if v_page.slug in ('privacy','terms','refund','disclaimer','session-policy')
     and p_status in ('scheduled','published')
     and (p_legal_review_status <> 'approved' or v_legal_version is null or p_effective_at is null) then
    raise exception using errcode = '23514', message = 'legal_page_approval_required';
  end if;
  if v_page.slug = 'home' and p_status in ('scheduled','published') and exists (
    select 1 from (values ('hero'),('pathways'),('cta')) required(kind)
     where not exists (
       select 1 from public.page_sections section
        where section.page_id = v_page.id and section.kind = required.kind and section.is_visible
     )
  ) then
    raise exception using errcode = '23514', message = 'home_page_required_sections';
  end if;

  insert into public.content_revisions(entity_type, entity_id, snapshot, created_by)
  values ('page', v_page.id, to_jsonb(v_page), p_actor_id);
  update public.pages
     set title = v_title,
         seo_title = v_seo_title,
         seo_description = v_seo_description,
         canonical_url = v_canonical,
         og_image_url = v_og_image,
         status = p_status,
         publish_at = case when p_status = 'scheduled' then p_publish_at else null end,
         is_published = p_status = 'published',
         legal_review_status = p_legal_review_status,
         legal_version = v_legal_version,
         effective_at = p_effective_at,
         revision = v_page.revision + 1
   where id = v_page.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'page.saved', 'page', v_page.id::text,
    jsonb_build_object(
      'fromStatus', v_page.status,
      'toStatus', p_status,
      'hasSchedule', p_status = 'scheduled',
      'legalReviewStatus', p_legal_review_status,
      'hasLegalVersion', v_legal_version is not null,
      'hasEffectiveDate', p_effective_at is not null
    )
  );
  return jsonb_build_object('id', v_page.id, 'pageSlug', v_page.slug, 'action', 'page.saved');
end $$;

revoke all on function public.manage_cms_page(uuid,text,uuid,text,text,text,text,text,text,text,timestamptz,text,text,date)
  from public, anon, authenticated;
grant execute on function public.manage_cms_page(uuid,text,uuid,text,text,text,text,text,text,text,timestamptz,text,text,date)
  to service_role;

create or replace function public.publish_scheduled_content()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.pages%rowtype;
  v_article_id uuid;
  v_pages integer := 0;
  v_articles integer := 0;
begin
  for v_page in
    select * from public.pages where status = 'scheduled' and publish_at <= now() for update
  loop
    if v_page.slug in ('privacy','terms','refund','disclaimer','session-policy')
       and (v_page.legal_review_status <> 'approved' or v_page.legal_version is null or v_page.effective_at is null) then
      continue;
    end if;
    if v_page.slug = 'home' and exists (
      select 1 from (values ('hero'),('pathways'),('cta')) required(kind)
       where not exists (
         select 1 from public.page_sections section
          where section.page_id = v_page.id and section.kind = required.kind and section.is_visible
       )
    ) then
      continue;
    end if;
    update public.pages set status = 'published', is_published = true, revision = revision + 1 where id = v_page.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (null, 'page.scheduled_published', 'page', v_page.id::text, jsonb_build_object('fromStatus','scheduled','toStatus','published'));
    v_pages := v_pages + 1;
  end loop;

  for v_article_id in
    select id from public.articles where status = 'scheduled' and publish_at <= now() for update
  loop
    update public.articles
       set status = 'published', is_published = true, published_at = coalesce(published_at, now())
     where id = v_article_id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (null, 'article.scheduled_published', 'article', v_article_id::text, jsonb_build_object('fromStatus','scheduled','toStatus','published'));
    v_articles := v_articles + 1;
  end loop;
  return jsonb_build_object('pages', v_pages, 'articles', v_articles);
end $$;

revoke all on function public.publish_scheduled_content() from public, anon, authenticated;
grant execute on function public.publish_scheduled_content() to service_role;

comment on function public.manage_cms_page(uuid,text,uuid,text,text,text,text,text,text,text,timestamptz,text,text,date) is
  'Service-only CMS page create/update/SEO with permissioned publication, prior revision and metadata-only audit in one transaction.';

-- Rollback-by-forward-fix: preserve revisions and audits. Replace functions in
-- a later migration; never restore browser-direct page writes.
