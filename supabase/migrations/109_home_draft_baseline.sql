-- No automatic seed or publication. An authorized operator explicitly creates
-- a draft from the server's current public renderer inputs after this review.
create table public.home_draft_baselines (
 page_id uuid primary key references public.pages(id) on delete cascade,
 snapshot jsonb not null,
 captured_at timestamptz not null default now(),
 captured_by uuid not null references auth.users(id),
 source_hash text not null
);
alter table public.home_draft_baselines enable row level security;
revoke all on public.home_draft_baselines from anon,authenticated;
grant select on public.home_draft_baselines to authenticated;
grant all on public.home_draft_baselines to service_role;
create policy "home baseline: content managers read" on public.home_draft_baselines for select to authenticated using(public.has_permission('content.manage'));

create function public.initialize_home_draft(p_actor_id uuid,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.pages%rowtype;s jsonb;item jsonb;section_count integer;source_hash text;
begin
 if p_actor_id is null or not public.has_permission('content.manage',p_actor_id) then raise exception using errcode='42501',message='content_management_required';end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' or p_snapshot->>'format' is distinct from '1' or jsonb_typeof(p_snapshot->'sections') is distinct from 'array' or octet_length(p_snapshot::text)>524288 then raise exception using errcode='22023',message='home_snapshot_invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('home-draft-initialize',0));
 select * into p from public.pages where slug='home' for update;
 if found then
  if exists(select 1 from public.home_draft_baselines where page_id=p.id) then return jsonb_build_object('id',p.id,'created',false);end if;
  if p.is_published or p.status<>'draft' or exists(select 1 from public.page_sections where page_id=p.id) then raise exception using errcode='55000',message='home_existing_content_preserved';end if;
 else
  insert into public.pages(slug,title,status,is_published) values('home','الصفحة الرئيسية','draft',false) returning * into p;
 end if;
 section_count:=jsonb_array_length(p_snapshot->'sections');
 if section_count not between 3 and 100 then raise exception using errcode='22023',message='home_snapshot_invalid';end if;
 if (select count(distinct x->>'kind') from jsonb_array_elements(p_snapshot->'sections') x)<>section_count then raise exception using errcode='22023',message='home_snapshot_duplicate_section';end if;
 if exists(select 1 from (values('hero'),('pathways'),('cta')) required(kind) where not exists(select 1 from jsonb_array_elements(p_snapshot->'sections') x where x->>'kind'=required.kind and x->>'isVisible'='true')) then raise exception using errcode='22023',message='home_snapshot_required_sections';end if;
 for s in select value from jsonb_array_elements(p_snapshot->'sections') loop
  if s->>'kind' is null or s->>'kind' not in ('hero','trust','manifesto','quote','pathways','guided_start','editorial_feature','offer','articles','resources','testimonials','press','newsletter','cta')
   or char_length(coalesce(s->>'name','')) not between 2 and 100 or jsonb_typeof(s->'isVisible') is distinct from 'boolean' or jsonb_typeof(s->'sort') is distinct from 'number' or (s->>'sort')::integer not between 0 and 1000
   or not public.master_v2_home_content_valid(s->>'kind',s->'content') or not public.cms_restore_content_valid(s->'content') then raise exception using errcode='22023',message='home_snapshot_section_invalid';end if;
  insert into public.page_sections(page_id,name,kind,sort,is_visible,content) values(p.id,s->>'name',s->>'kind',(s->>'sort')::integer,(s->>'isVisible')::boolean,s->'content');
 end loop;
 source_hash:=encode(extensions.digest(p_snapshot::text,'sha256'),'hex');
 insert into public.home_draft_baselines(page_id,snapshot,captured_by,source_hash) values(p.id,p_snapshot,p_actor_id,source_hash);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'home.draft_initialized','page',p.id::text,jsonb_build_object('sections',section_count,'source_hash',source_hash,'published',false));
 return jsonb_build_object('id',p.id,'created',true);
end $$;
revoke all on function public.initialize_home_draft(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.initialize_home_draft(uuid,jsonb) to service_role;
