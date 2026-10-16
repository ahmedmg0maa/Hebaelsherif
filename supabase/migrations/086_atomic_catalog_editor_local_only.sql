-- 086: LOCAL ONLY. Accept on isolated Staging after 085 and recovery evidence.
-- Catalog product/domain/media/revision/audit writes commit or roll back together.
-- This does not claim acceptance of other catalog writers or cross-session QA.
begin;

create or replace function public.catalog_editor_payload_valid(p_kind text, p jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare
  keys text[] := array['title','slug','subtitle','description','price','compare_at_price','currency','sort','cover_url','cover_asset_id','is_published'];
  k text; n numeric;
begin
  if p_kind not in ('course','book','workshop','service') or p_kind is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>131072 then return false; end if;
  keys := keys || case p_kind
    when 'course' then array['level','duration_minutes']
    when 'book' then array['author','pages_count']
    when 'workshop' then array['starts_at','ends_at','seats_total','location_kind','location_text','meeting_url']
    else array['duration_minutes','booking_payment_mode','buffer_before_minutes','buffer_after_minutes','minimum_notice_minutes','booking_window_days','hold_minutes','cancellation_notice_hours','reschedule_notice_hours','max_reschedules','booking_policy_note'] end;
  if not (p ?& keys) or exists(select 1 from jsonb_object_keys(p) x where not x=any(keys)) then return false; end if;
  foreach k in array array['title','slug','subtitle','description','currency'] loop
    if jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
  end loop;
  if char_length(btrim(p->>'title')) not between 2 and 180 or char_length(p->>'slug') not between 3 and 80
    or (p->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or (p->>'currency') !~ '^[A-Z]{3}$'
    or char_length(p->>'subtitle')>240 or char_length(p->>'description')>30000
    or jsonb_typeof(p->'is_published') is distinct from 'boolean' then return false; end if;
  foreach k in array array['price','compare_at_price','sort','duration_minutes','pages_count','seats_total','buffer_before_minutes','buffer_after_minutes','minimum_notice_minutes','booking_window_days','hold_minutes','cancellation_notice_hours','reschedule_notice_hours','max_reschedules'] loop
    if not (k=any(keys)) then continue; end if;
    if p->k='null'::jsonb and k in ('compare_at_price','pages_count','buffer_before_minutes','buffer_after_minutes','minimum_notice_minutes','booking_window_days','cancellation_notice_hours','reschedule_notice_hours') then continue; end if;
    if jsonb_typeof(p->k) is distinct from 'number' then return false; end if;
    n := (p->>k)::numeric;
    if n<0 or n>99999999.99 or n<>round(n,case when k in ('price','compare_at_price') then 2 else 0 end) then return false; end if;
    if k in ('sort','duration_minutes','pages_count','seats_total') and n>100000 then return false; end if;
    if k in ('buffer_before_minutes','buffer_after_minutes','minimum_notice_minutes','cancellation_notice_hours','reschedule_notice_hours') and n>525600 then return false; end if;
  end loop;
  foreach k in array array['cover_url','cover_asset_id','meeting_url'] loop
    if not (k=any(keys)) or p->k='null'::jsonb then continue; end if;
    if jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
    if k='cover_asset_id' then perform (p->>k)::uuid;
    elsif (p->>k)!~ '^https://[^[:space:]]+$' or char_length(p->>k)>(case when k='meeting_url' then 500 else 1000 end) then return false; end if;
  end loop;
  if p_kind='course' and (coalesce(p->>'level','') not in ('all','beginner','intermediate','advanced')) then return false; end if;
  if p_kind='book' and (jsonb_typeof(p->'author') is distinct from 'string' or char_length(p->>'author')>180 or coalesce((p->>'pages_count')::int,1)<1) then return false; end if;
  if p_kind='workshop' then
    if jsonb_typeof(p->'location_text') is distinct from 'string' or char_length(p->>'location_text')>1000
      or coalesce(p->>'location_kind','') not in ('online','in_person','hybrid')
      or coalesce(p->>'starts_at','')!~ '^\d{4}-\d{2}-\d{2}T.*Z$' or coalesce(p->>'ends_at','')!~ '^\d{4}-\d{2}-\d{2}T.*Z$'
      or (p->>'ends_at')::timestamptz <= (p->>'starts_at')::timestamptz then return false; end if;
  end if;
  if p_kind='service' then
    if (p->>'duration_minutes')::int not between 15 and 1440 or (p->>'hold_minutes')::int not between 2 and 30
      or (p->>'max_reschedules')::int not between 0 and 12 or coalesce((p->>'booking_window_days')::int,1) not between 1 and 365
      or coalesce(p->>'booking_payment_mode','') not in ('payment_required','free')
      or jsonb_typeof(p->'booking_policy_note') is distinct from 'string' or char_length(p->>'booking_policy_note')>4000 then return false; end if;
  end if;
  return true;
exception when others then return false;
end $$;

create or replace function public.catalog_require_publication_ready(p_kind text,p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare d jsonb; p public.products%rowtype; tbl text; asset public.media_assets%rowtype; asset_id uuid;
begin
  tbl := case p_kind when 'course' then 'courses' when 'book' then 'books' when 'workshop' then 'workshops' when 'service' then 'services' end;
  if tbl is null then raise exception 'catalog_kind_invalid'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for share',tbl) into d using p_id;
  if d is null then raise exception 'catalog_not_found'; end if;
  select * into p from public.products where id=(d->>'product_id')::uuid for share;
  if not found or char_length(btrim(p.title))<3 or char_length(btrim(coalesce(p.subtitle,'')))<3 or char_length(btrim(p.description))<24
    or p.currency!~'^[A-Z]{3}$' or p.price<0 then raise exception 'catalog_publication_incomplete'; end if;
  select u.asset_id into asset_id from public.media_usages u where u.entity_type=p_kind and u.entity_id=p_id::text and u.field='cover_url' limit 1;
  select * into asset from public.media_assets where id=asset_id for share;
  if not found or asset.archived_at is not null or asset.bucket<>'public-media' or asset.visibility<>'public' or asset.kind<>'image'
    or asset.processing_status not in ('original','ready') or asset.rights_status not in ('owned','licensed','public_domain')
    or btrim(asset.rights_reference)='' or nullif(p.cover_url,'') is null then raise exception 'catalog_media_rights_required'; end if;
  if p_kind='course' then
    perform 1 from public.course_modules where course_id=p_id for share;
    perform 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=p_id for share of l;
    if (d->>'duration_minutes')::int<15 or not exists(select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=p_id)
      or exists(select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=p_id and nullif(btrim(l.video_path),'') is null and char_length(btrim(l.description))<24)
      then raise exception 'catalog_course_incomplete'; end if;
  elsif p_kind='book' then
    perform 1 from public.book_files where book_id=p_id and archived_at is null for share;
    if coalesce((d->>'pages_count')::int,0)<1 or not exists(select 1 from public.book_files where book_id=p_id and archived_at is null and nullif(btrim(storage_path),'') is not null)
      then raise exception 'catalog_book_incomplete'; end if;
  elsif p_kind='workshop' then
    if (d->>'starts_at')::timestamptz<=now() or (d->>'ends_at')::timestamptz<=(d->>'starts_at')::timestamptz
      or (d->>'seats_total')::int<1 or (d->>'seats_total')::int<(d->>'seats_reserved')::int
      or (d->>'location_kind'<>'online' and char_length(btrim(coalesce(d->>'location_text','')))<3)
      or (d->>'location_kind'<>'in_person' and coalesce(d->>'meeting_url','')!~'^https://[^[:space:]]+$') then raise exception 'catalog_workshop_incomplete'; end if;
  else
    perform 1 from public.availability_rules where service_id=p_id for share;
    if (d->>'duration_minutes')::int<15 or not exists(select 1 from public.availability_rules where service_id=p_id)
      or (d->>'booking_payment_mode'='free' and p.price<>0) or (d->>'booking_payment_mode'='payment_required' and p.price<=0)
      then raise exception 'catalog_service_incomplete'; end if;
  end if;
end $$;

create or replace function public.manage_catalog_item(p_actor_id uuid,p_kind text,p_id uuid,p_action text,p_content jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
<<catalog_op>>
declare
  tbl text; cols text[]; names text; selections text; assignments text;
  old_domain jsonb; old_product public.products%rowtype; product public.products%rowtype;
  d jsonb; payload jsonb; domain_id uuid:=p_id; product_id uuid; asset_id uuid; asset public.media_assets%rowtype;
  published boolean; previous_slug text; existed boolean:=p_id is not null;
begin
  tbl:=case p_kind when 'course' then 'courses' when 'book' then 'books' when 'workshop' then 'workshops' when 'service' then 'services' end;
  if tbl is null or p_action is null or p_action not in ('save','publication','delete') or p_actor_id is null then raise exception 'catalog_action_invalid'; end if;
  if public.has_permission(case p_action when 'save' then 'catalog.manage' when 'publication' then 'catalog.publish' else 'catalog.delete' end,p_actor_id) is not true then raise exception using errcode='42501',message='catalog_permission_required'; end if;
  if p_action='save' and not public.catalog_editor_payload_valid(p_kind,p_content) then raise exception using errcode='22023',message='catalog_payload_invalid'; end if;
  if p_action<>'save' and p_id is null then raise exception 'catalog_id_required'; end if;
  if p_action='publication' and (jsonb_typeof(p_content->'is_published') is distinct from 'boolean' or p_content-array['is_published']<>'{}'::jsonb) then raise exception 'catalog_payload_invalid'; end if;
  if existed then
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tbl) into old_domain using p_id;
    if old_domain is null then raise exception 'catalog_not_found'; end if;
    product_id:=(old_domain->>'product_id')::uuid;
    select * into old_product from public.products where id=product_id for update;
    if not found or old_product.type<>(case when p_kind='service' then 'session' else p_kind end) then raise exception 'catalog_link_invalid'; end if;
    previous_slug:=old_product.slug;
  end if;
  published:=case when p_action='delete' then false else (p_content->>'is_published')::boolean end;
  if p_action='save' and (published or coalesce(old_product.is_published,false)) and public.has_permission('catalog.publish',p_actor_id) is not true then raise exception using errcode='42501',message='catalog_publish_required'; end if;
  if existed then insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) values(p_kind,p_id,jsonb_build_object('domain',old_domain,'product',to_jsonb(old_product)),p_actor_id); end if;
  if p_action='delete' then
    if exists(select 1 from public.order_items where order_items.product_id=catalog_op.product_id)
      or exists(select 1 from public.content_access where content_access.product_id=catalog_op.product_id)
      or (p_kind='course' and exists(select 1 from public.course_enrollments where course_id=p_id))
      or (p_kind='book' and exists(select 1 from public.book_access where book_id=p_id))
      or (p_kind='workshop' and exists(select 1 from public.workshop_registrations where workshop_id=p_id))
      or (p_kind='service' and exists(select 1 from public.bookings where service_id=p_id)) then raise exception using errcode='23503',message='catalog_history_exists'; end if;
    -- Keep private delivery bindings and bundle composition intact. Unpublish
    -- instead; governed delivery removal owns object cleanup and its audit.
    if exists(select 1 from public.product_bundles where child_product_id=product_id)
      or (p_kind='book' and exists(select 1 from public.book_files where book_id=p_id))
      or (p_kind='course' and exists(select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=p_id and (l.video_path is not null or exists(select 1 from public.lesson_resources r where r.lesson_id=l.id))))
      or (p_kind='workshop' and (exists(select 1 from public.workshop_resources where workshop_id=p_id) or exists(select 1 from public.workshop_recordings where workshop_id=p_id)))
      then raise exception using errcode='23503',message='catalog_delivery_or_bundle_exists'; end if;
    delete from public.media_usages where field='cover_url' and ((entity_type=p_kind and entity_id=p_id::text) or (entity_type='product' and entity_id=product_id::text));
    delete from public.products where id=product_id;
  elsif p_action='publication' then
    update public.products set is_published=published where id=product_id;
    execute format('update public.%I set %I=$1 where id=$2',tbl,case when p_kind='service' then 'is_active' else 'is_published' end) using published,p_id;
    if published then perform public.catalog_require_publication_ready(p_kind,p_id); end if;
  else
    asset_id:=(p_content->>'cover_asset_id')::uuid;
    if asset_id is null and existed and p_content->>'cover_url' is not distinct from old_product.cover_url and old_product.cover_url is not null then
      select u.asset_id into asset_id from public.media_usages u where u.entity_type=p_kind and u.entity_id=p_id::text and u.field='cover_url' limit 1;
    end if;
    if asset_id is not null then
      select * into asset from public.media_assets where id=asset_id for share;
      if not found or asset.archived_at is not null or asset.kind<>'image' or asset.visibility<>'public' or asset.bucket<>'public-media' then raise exception 'catalog_media_invalid'; end if;
    elsif p_content->>'cover_url' is not null and (not existed or p_content->>'cover_url' is distinct from old_product.cover_url) then raise exception 'catalog_managed_cover_required'; end if;
    payload:=p_content||jsonb_build_object('type',case when p_kind='service' then 'session' else p_kind end);
    product:=jsonb_populate_record(null::public.products,payload);
    if existed then
      update public.products set title=product.title,slug=product.slug,subtitle=product.subtitle,description=product.description,price=product.price,
        compare_at_price=product.compare_at_price,currency=product.currency,sort=product.sort,cover_url=product.cover_url,is_published=published where id=product_id;
    else
      insert into public.products(type,title,slug,subtitle,description,price,compare_at_price,currency,sort,cover_url,is_published)
      values(product.type,product.title,product.slug,product.subtitle,product.description,product.price,product.compare_at_price,product.currency,product.sort,product.cover_url,published) returning id into product_id;
    end if;
    payload:=payload||jsonb_build_object('product_id',product_id,'is_active',published);
    cols:=array['product_id','title','slug','description'];
    cols:=cols||case p_kind
      when 'course' then array['level','duration_minutes','cover_url','is_published']
      when 'book' then array['author','pages_count','cover_url','is_published']
      when 'workshop' then array['starts_at','ends_at','seats_total','location_kind','location_text','meeting_url','cover_url','is_published']
      else array['price','duration_minutes','is_active','booking_payment_mode','buffer_before_minutes','buffer_after_minutes','minimum_notice_minutes','booking_window_days','hold_minutes','cancellation_notice_hours','reschedule_notice_hours','max_reschedules','booking_policy_note'] end;
    select string_agg(format('%I',c),','),string_agg(format('x.%I',c),','),string_agg(format('%I=x.%I',c,c),',') into names,selections,assignments from unnest(cols) c;
    if existed then
      if p_kind='workshop' and (p_content->>'seats_total')::int<(old_domain->>'seats_reserved')::int then raise exception 'catalog_capacity_below_reserved'; end if;
      execute format('update public.%I d set %s from jsonb_populate_record(null::public.%I,$1) x where d.id=$2 returning to_jsonb(d)',tbl,assignments,tbl) into d using payload,p_id;
    else
      execute format('insert into public.%I as d (%s) select %s from jsonb_populate_record(null::public.%I,$1) x returning to_jsonb(d)',tbl,names,selections,tbl) into d using payload;
      domain_id:=(d->>'id')::uuid;
    end if;
    delete from public.media_usages where field='cover_url' and ((entity_type=p_kind and entity_id=domain_id::text) or (entity_type='product' and entity_id=product_id::text));
    if asset_id is not null then
      insert into public.media_usages(asset_id,entity_type,entity_id,field,created_by) values(asset_id,p_kind,domain_id::text,'cover_url',p_actor_id),(asset_id,'product',product_id::text,'cover_url',p_actor_id);
    end if;
    if published then perform public.catalog_require_publication_ready(p_kind,domain_id); end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,p_kind||'.'||case p_action when 'delete' then 'deleted' when 'publication' then 'publication_changed' else case when existed then 'updated' else 'created' end end,p_kind,domain_id::text,jsonb_build_object('published',published,'operation',p_action));
  return jsonb_build_object('id',domain_id,'productId',product_id,'previousSlug',previous_slug,'slug',coalesce(p_content->>'slug',previous_slug));
end $$;

revoke all on function public.catalog_editor_payload_valid(text,jsonb) from public,anon,authenticated;
revoke all on function public.catalog_require_publication_ready(text,uuid) from public,anon,authenticated;
revoke all on function public.manage_catalog_item(uuid,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.catalog_editor_payload_valid(text,jsonb) to service_role;
grant execute on function public.catalog_require_publication_ready(text,uuid) to service_role;
grant execute on function public.manage_catalog_item(uuid,text,uuid,text,jsonb) to service_role;
revoke insert,update,delete on public.products,public.courses,public.books,public.workshops,public.services from anon,authenticated;
commit;
