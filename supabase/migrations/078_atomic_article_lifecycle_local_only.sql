-- 078: atomic article content, media usage, lifecycle and audit governance.
-- LOCAL ONLY. Apply after 077 on authorized Staging with verified recovery.

drop policy if exists "articles: permitted write" on public.articles;
revoke insert, update, delete on table public.articles from anon, authenticated;

create or replace function public.article_publication_ready(p_article_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.articles article
     where article.id = p_article_id
       and length(btrim(article.title)) between 3 and 160
       and length(btrim(article.excerpt)) between 20 and 500
       and length(btrim(article.content)) between 100 and 100000
       and (
         article.cover_url is null
         or exists (
           select 1 from public.media_usages usage
           join public.media_assets asset on asset.id = usage.asset_id
            where usage.entity_type = 'article' and usage.entity_id = article.id::text
              and usage.field = 'cover_url' and asset.bucket = 'public-media'
              and asset.visibility = 'public' and asset.kind = 'image'
              and asset.archived_at is null
              and asset.rights_status in ('owned','licensed','public_domain')
              and asset.processing_status in ('original','ready')
         )
       )
  )
$$;

revoke all on function public.article_publication_ready(uuid) from public, anon, authenticated;
grant execute on function public.article_publication_ready(uuid) to service_role;

create or replace function public.manage_article(
  p_actor_id uuid,
  p_action text,
  p_article_id uuid default null,
  p_title text default null,
  p_slug text default null,
  p_excerpt text default null,
  p_content text default null,
  p_cover_url text default null,
  p_cover_asset_id uuid default null,
  p_seo_title text default null,
  p_seo_description text default null,
  p_status text default null,
  p_publish_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_article public.articles%rowtype;
  v_asset public.media_assets%rowtype;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_excerpt text := btrim(coalesce(p_excerpt, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_cover text := nullif(btrim(coalesce(p_cover_url, '')), '');
  v_seo_title text := nullif(btrim(coalesce(p_seo_title, '')), '');
  v_seo_description text := nullif(btrim(coalesce(p_seo_description, '')), '');
  v_count integer;
  v_from_status text;
  v_to_status text;
begin
  if p_actor_id is null or p_action is null or p_action not in ('create','content_update','lifecycle','archive') then
    raise exception using errcode='22023', message='article_operation_invalid';
  end if;
  if p_action = 'archive' then
    if not public.has_permission('content.delete', p_actor_id) then raise exception using errcode='42501', message='content_deletion_required'; end if;
  elsif p_action = 'lifecycle' then
    if not public.has_permission('content.publish', p_actor_id) then raise exception using errcode='42501', message='content_publish_required'; end if;
  elsif not public.has_permission('content.manage', p_actor_id) then
    raise exception using errcode='42501', message='content_management_required';
  end if;

  if p_action = 'create' then
    if p_article_id is not null or length(v_title) not between 3 and 160
       or length(v_slug) not between 3 and 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or length(v_excerpt) > 500 or length(v_content) > 100000 then
      raise exception using errcode='22023', message='article_payload_invalid';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('articles',0));
    select count(*)::integer into v_count from public.articles;
    if v_count >= 1000 then raise exception using errcode='54000', message='article_limit_reached'; end if;
    insert into public.articles(title,slug,excerpt,content,author_id,status,is_published)
    values(v_title,v_slug,v_excerpt,v_content,p_actor_id,'draft',false) returning id into v_id;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
    values(p_actor_id,'article.created','article',v_id::text,jsonb_build_object('slug',v_slug,'status','draft'));
    return jsonb_build_object('id',v_id,'previousSlug',null,'articleSlug',v_slug,'action','article.created');
  end if;

  if p_article_id is null then raise exception using errcode='22023', message='article_identity_required'; end if;
  select * into v_article from public.articles where id=p_article_id for update;
  if not found then raise exception using errcode='P0002', message='article_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('article:'||p_article_id::text,0));
  v_from_status := v_article.status;

  if p_action = 'content_update' then
    if v_article.status in ('scheduled','published') and not public.has_permission('content.publish',p_actor_id) then
      raise exception using errcode='42501', message='content_publish_required';
    end if;
    if length(v_title) not between 3 and 160 or length(v_slug) not between 3 and 80
       or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_excerpt)>500
       or length(v_content)>100000 or length(coalesce(v_seo_title,''))>70
       or length(coalesce(v_seo_description,''))>180 or length(coalesce(v_cover,''))>500
       or (v_cover is not null and (left(v_cover,8)<>'https://' or v_cover ~ '[[:space:]]')) then
      raise exception using errcode='22023', message='article_payload_invalid';
    end if;
    if p_cover_asset_id is not null then
      select * into v_asset from public.media_assets where id=p_cover_asset_id for update;
      if not found or v_asset.bucket<>'public-media' or v_asset.visibility<>'public'
         or v_asset.kind<>'image' or v_asset.archived_at is not null then
        raise exception using errcode='23514', message='article_cover_asset_invalid';
      end if;
    end if;
    insert into public.content_revisions(entity_type,entity_id,snapshot,created_by)
    values('article',v_article.id,to_jsonb(v_article),p_actor_id);
    update public.articles set title=v_title,slug=v_slug,excerpt=v_excerpt,content=v_content,
      cover_url=v_cover,seo_title=v_seo_title,seo_description=v_seo_description where id=v_article.id;
    delete from public.media_usages where entity_type='article' and entity_id=v_article.id::text and field='cover_url';
    if p_cover_asset_id is not null then
      insert into public.media_usages(asset_id,entity_type,entity_id,field,created_by)
      values(p_cover_asset_id,'article',v_article.id::text,'cover_url',p_actor_id);
    end if;
    if v_article.status in ('scheduled','published') and not public.article_publication_ready(v_article.id) then
      raise exception using errcode='23514', message='article_publication_incomplete';
    end if;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
    values(p_actor_id,'article.updated','article',v_article.id::text,
      jsonb_build_object('slugChanged',v_article.slug<>v_slug,'hasCover',v_cover is not null,'managedCover',p_cover_asset_id is not null));
    return jsonb_build_object('id',v_article.id,'previousSlug',v_article.slug,'articleSlug',v_slug,'action','article.updated');
  end if;

  insert into public.content_revisions(entity_type,entity_id,snapshot,created_by)
  values('article',v_article.id,to_jsonb(v_article),p_actor_id);
  if p_action='archive' then
    update public.articles set status='archived',is_published=false,publish_at=null where id=v_article.id;
    v_to_status := 'archived';
  else
    if p_status not in ('draft','scheduled','published','archived')
       or (p_status='scheduled' and (p_publish_at is null or p_publish_at<=now())) then
      raise exception using errcode='22023', message='article_lifecycle_invalid';
    end if;
    if p_status in ('scheduled','published') and not public.article_publication_ready(v_article.id) then
      raise exception using errcode='23514', message='article_publication_incomplete';
    end if;
    update public.articles set status=p_status,is_published=p_status='published',
      publish_at=case when p_status='scheduled' then p_publish_at else null end,
      published_at=case when p_status='published' then coalesce(v_article.published_at,now()) else v_article.published_at end
      where id=v_article.id;
    v_to_status := p_status;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
  values(p_actor_id,case when p_action='archive' then 'article.archived' else 'article.lifecycle_changed' end,
    'article',v_article.id::text,jsonb_build_object('fromStatus',v_from_status,'toStatus',v_to_status,'hasSchedule',v_to_status='scheduled'));
  return jsonb_build_object('id',v_article.id,'previousSlug',v_article.slug,'articleSlug',v_article.slug,
    'action',case when p_action='archive' then 'article.archived' else 'article.lifecycle_changed' end);
end $$;

revoke all on function public.manage_article(uuid,text,uuid,text,text,text,text,text,uuid,text,text,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.manage_article(uuid,text,uuid,text,text,text,text,text,uuid,text,text,text,timestamptz) to service_role;

create or replace function public.publish_scheduled_content()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_page public.pages%rowtype;v_article_id uuid;v_pages integer:=0;v_articles integer:=0;
begin
  for v_page in select * from public.pages where status='scheduled' and publish_at<=now() for update loop
    if v_page.slug in ('privacy','terms','refund','disclaimer','session-policy') and (v_page.legal_review_status<>'approved' or v_page.legal_version is null or v_page.effective_at is null) then continue;end if;
    if v_page.slug='home' and exists(select 1 from(values('hero'),('pathways'),('cta'))required(kind) where not exists(select 1 from public.page_sections section where section.page_id=v_page.id and section.kind=required.kind and section.is_visible))then continue;end if;
    update public.pages set status='published',is_published=true,revision=revision+1 where id=v_page.id;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)values(null,'page.scheduled_published','page',v_page.id::text,jsonb_build_object('fromStatus','scheduled','toStatus','published'));v_pages:=v_pages+1;
  end loop;
  for v_article_id in select id from public.articles where status='scheduled' and publish_at<=now() for update loop
    if not public.article_publication_ready(v_article_id) then continue;end if;
    update public.articles set status='published',is_published=true,published_at=coalesce(published_at,now()) where id=v_article_id;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)values(null,'article.scheduled_published','article',v_article_id::text,jsonb_build_object('fromStatus','scheduled','toStatus','published'));v_articles:=v_articles+1;
  end loop;
  return jsonb_build_object('pages',v_pages,'articles',v_articles);
end $$;
revoke all on function public.publish_scheduled_content() from public,anon,authenticated;
grant execute on function public.publish_scheduled_content() to service_role;

-- Rollback-by-forward-fix only. Preserve article rows, revisions and audit.
