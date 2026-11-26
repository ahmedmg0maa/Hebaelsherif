-- 075: atomic page-section revision, mutation and audit governance.
-- LOCAL ONLY. Apply after 074 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

revoke insert, update, delete on table public.page_sections from anon, authenticated;
revoke insert, update, delete on table public.content_revisions from anon, authenticated;

create or replace function public.manage_cms_page_section(
  p_actor_id uuid,
  p_action text,
  p_page_id uuid,
  p_section_id uuid default null,
  p_name text default null,
  p_kind text default null,
  p_sort integer default null,
  p_is_visible boolean default true,
  p_content jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.pages%rowtype;
  v_section public.page_sections%rowtype;
  v_id uuid;
  v_action text;
  v_name text := btrim(coalesce(p_name, ''));
  v_kind text := btrim(coalesce(p_kind, ''));
  v_count integer;
  v_home_action boolean;
  v_required_home_kind boolean;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'content_management_required';
  end if;
  if p_action = 'section_delete' then
    if not public.has_permission('content.delete', p_actor_id) then
      raise exception using errcode = '42501', message = 'content_deletion_required';
    end if;
  elsif not public.has_permission('content.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'content_management_required';
  end if;
  if p_page_id is null or p_action not in ('home_create','home_update','section_create','section_update','section_delete') then
    raise exception using errcode = '22023', message = 'page_section_operation_invalid';
  end if;

  select * into v_page from public.pages where id = p_page_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'cms_page_not_found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cms-page-sections:' || p_page_id::text, 0));
  v_home_action := p_action in ('home_create','home_update');
  if (v_page.slug = 'home') <> v_home_action and p_action <> 'section_delete' then
    raise exception using errcode = '22023', message = 'page_section_surface_mismatch';
  end if;

  if p_action <> 'section_delete' then
    if length(v_name) not between 2 and 100 or v_name ~ '[[:cntrl:]]'
       or p_sort is null or p_sort not between 0 and 1000
       or p_content is null or jsonb_typeof(p_content) <> 'object'
       or octet_length(p_content::text) > 65536
       or p_content::text ~* '(javascript:|data:text/html|<script)' then
      raise exception using errcode = '22023', message = 'page_section_payload_invalid';
    end if;
    if v_kind not in (
      'hero','intro','trust','pathways','guided_start','editorial_feature',
      'featured_services','books','courses','workshops','availability_preview',
      'offer','testimonials','press','articles','resources','newsletter','cta','rich_text'
    ) then
      raise exception using errcode = '22023', message = 'page_section_kind_invalid';
    end if;
    if v_home_action and v_kind not in (
      'hero','trust','pathways','guided_start','editorial_feature','offer',
      'articles','resources','testimonials','press','newsletter','cta'
    ) then
      raise exception using errcode = '22023', message = 'home_section_kind_invalid';
    end if;
  end if;

  if p_action in ('home_create','section_create') then
    if p_section_id is not null then
      raise exception using errcode = '22023', message = 'page_section_create_identity_invalid';
    end if;
    select count(*)::integer into v_count from public.page_sections where page_id = p_page_id;
    if v_count >= 100 then raise exception using errcode = '54000', message = 'page_section_limit_reached'; end if;
    if p_action = 'home_create' and exists (
      select 1 from public.page_sections where page_id = p_page_id and kind = v_kind
    ) then
      raise exception using errcode = '23505', message = 'home_section_kind_exists';
    end if;
    insert into public.page_sections(page_id, name, kind, sort, is_visible, content)
    values (p_page_id, v_name, v_kind, p_sort, coalesce(p_is_visible, true), p_content)
    returning id into v_id;
    v_action := case when p_action = 'home_create' then 'home_section.created' else 'page_section.created' end;
  else
    if p_section_id is null then
      raise exception using errcode = '22023', message = 'page_section_identity_required';
    end if;
    select * into v_section
      from public.page_sections
     where id = p_section_id and page_id = p_page_id
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'page_section_not_found'; end if;
    v_required_home_kind := v_page.slug = 'home' and v_section.kind in ('hero','pathways','cta');

    if p_action = 'section_delete' then
      if v_page.is_published and v_required_home_kind and v_section.is_visible then
        raise exception using errcode = '23514', message = 'published_home_required_section';
      end if;
      insert into public.content_revisions(entity_type, entity_id, snapshot, created_by)
      values ('page_section', v_section.id, to_jsonb(v_section), p_actor_id);
      delete from public.page_sections where id = v_section.id;
      v_id := v_section.id;
      v_action := 'page_section.deleted';
    else
      if p_action = 'home_update' and v_section.kind <> v_kind then
        raise exception using errcode = '22023', message = 'home_section_kind_immutable';
      end if;
      if v_page.is_published and v_required_home_kind and coalesce(p_is_visible, false) is false then
        raise exception using errcode = '23514', message = 'published_home_required_section';
      end if;
      if p_action = 'home_update' and exists (
        select 1 from public.page_sections
         where page_id = p_page_id and kind = v_kind and id <> v_section.id
      ) then
        raise exception using errcode = '23505', message = 'home_section_kind_exists';
      end if;
      insert into public.content_revisions(entity_type, entity_id, snapshot, created_by)
      values ('page_section', v_section.id, to_jsonb(v_section), p_actor_id);
      update public.page_sections
         set name = v_name, kind = v_kind, sort = p_sort,
             is_visible = coalesce(p_is_visible, false), content = p_content,
             revision = v_section.revision + 1
       where id = v_section.id
       returning id into v_id;
      v_action := case when p_action = 'home_update' then 'home_section.updated' else 'page_section.updated' end;
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, v_action, 'page_section', v_id::text,
    jsonb_build_object(
      'pageId', p_page_id,
      'kind', case when p_action = 'section_delete' then v_section.kind else v_kind end,
      'sort', case when p_action = 'section_delete' then v_section.sort else p_sort end,
      'visible', case when p_action = 'section_delete' then v_section.is_visible else coalesce(p_is_visible, false) end,
      'revisionCreated', p_action in ('home_update','section_update','section_delete')
    )
  );
  return jsonb_build_object('id', v_id, 'pageSlug', v_page.slug, 'action', v_action);
end $$;

revoke all on function public.manage_cms_page_section(uuid,text,uuid,uuid,text,text,integer,boolean,jsonb)
  from public, anon, authenticated;
grant execute on function public.manage_cms_page_section(uuid,text,uuid,uuid,text,text,integer,boolean,jsonb)
  to service_role;

comment on function public.manage_cms_page_section(uuid,text,uuid,uuid,text,text,integer,boolean,jsonb) is
  'Service-only page-section create/update/delete with repeated permission checks, page serialization, revision and metadata-only audit in one transaction.';

-- Rollback-by-forward-fix: preserve revisions and audits. Replace this function
-- in a later migration; never restore browser-direct CMS section writes.
