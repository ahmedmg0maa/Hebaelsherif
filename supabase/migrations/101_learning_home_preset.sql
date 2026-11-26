-- Explicit admin command; retains prior sections and revisions for recovery.
create function public.apply_learning_home_layout(p_actor uuid,p_sections jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare page public.pages%rowtype; item jsonb; section public.page_sections%rowtype;
begin
 if auth.role() is distinct from 'service_role' or not public.has_permission('content.manage',p_actor) or not public.has_permission('content.publish',p_actor) then raise exception 'content permission required' using errcode='42501';end if;
 if jsonb_typeof(p_sections)<>'array' or jsonb_array_length(p_sections)<>6 then raise exception 'invalid template';end if;
 perform pg_advisory_xact_lock(hashtextextended('home-learning-template',0));
 select * into page from public.pages where slug='home' for update;
 if not found then insert into public.pages(slug,title,is_published,status) values('home','الرئيسية',false,'draft') returning * into page;end if;
 for section in select * from public.page_sections where page_id=page.id and is_visible loop
  insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) values('page_section',section.id,to_jsonb(section),p_actor);
 end loop;
 update public.page_sections set is_visible=false where page_id=page.id;
 for item in select * from jsonb_array_elements(p_sections) loop
  if item->>'kind' not in ('hero','trust','pathways','editorial_feature','articles','cta') or jsonb_typeof(item->'content')<>'object' then raise exception 'invalid template section';end if;
  insert into public.page_sections(page_id,name,kind,sort,is_visible,content) values(page.id,item->>'name',item->>'kind',(item->>'sort')::int,true,item->'content');
 end loop;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'home.learning_template_applied','page',page.id::text,'{"priorSectionsRetained":true}');
 return page.id;
end $$;
revoke all on function public.apply_learning_home_layout(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_learning_home_layout(uuid,jsonb) to service_role;

-- Read-only deployment revision, no customer data or queue leases exposed.
create function public.launch_runtime_contract() returns jsonb
language sql stable security definer set search_path='' as $$
 select '{"revision":"101","owner":"096","calendar":"097","mail":"098","stream":"099","admission":"100","home":"101"}'::jsonb
$$;
revoke all on function public.launch_runtime_contract() from public,anon,authenticated;
grant execute on function public.launch_runtime_contract() to service_role;
