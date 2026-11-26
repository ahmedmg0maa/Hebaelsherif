-- 090: local only. Reviews retain author text and consent; moderation is versioned.
alter table public.reviews add column version integer not null default 1;
create function public.bump_review_version() returns trigger language plpgsql set search_path = '' as $$
begin new.version := old.version + 1; return new; end $$;
create trigger reviews_version before update on public.reviews for each row execute function public.bump_review_version();
revoke all on function public.bump_review_version() from public, anon, authenticated;
revoke insert, update, delete on public.reviews from anon, authenticated;
revoke all on function public.manage_review(uuid,uuid,text,text,text,boolean) from service_role;

create function public.manage_review_v2(p_review_id uuid, p_actor_id uuid, p_action text,
 p_expected_version integer, p_reason text default null, p_owner_response text default null, p_publish_response boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.reviews%rowtype; v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
 v_response text := nullif(btrim(coalesce(p_owner_response,'')),''); v_version integer;
begin
 if p_actor_id is null or public.has_permission('reviews.manage',p_actor_id) is not true then
  raise exception using errcode='42501',message='reviews_permission_required'; end if;
 if p_action is null or p_action not in ('approve','reject','archive','restore','feature','unfeature','respond','delete')
  or coalesce(p_expected_version,0)<1 or char_length(v_reason)>500 or char_length(v_response)>2000
  or regexp_replace(coalesce(v_reason,'') || coalesce(v_response,''), E'[\r\n\t]', '', 'g') ~ '[[:cntrl:]]'
  or (p_action='reject' and coalesce(char_length(v_reason),0)<3) then
  raise exception using errcode='22023',message='invalid_review_moderation'; end if;
 select * into r from public.reviews where id=p_review_id for update;
 if not found then raise exception using errcode='P0002',message='review_not_found'; end if;
 if r.version <> p_expected_version then raise exception using errcode='40001',message='review_version_conflict'; end if;
 if (r.status='archived' and p_action not in ('restore','delete')) or (p_action in ('restore','delete') and r.status<>'archived') then
  raise exception using errcode='22023',message='review_archive_state_required'; end if;
 if p_action in ('approve','feature') and (not r.verified_purchase or r.verified_at is null or r.publication_consent_at is null) then
  raise exception using errcode='22023',message='review_publication_evidence_required'; end if;
 if p_action in ('feature','unfeature','respond') and r.status<>'approved' then
  raise exception using errcode='22023',message='approved_review_required'; end if;
 if p_action='respond' and p_publish_response and (v_response is null or r.publication_consent_at is null or r.verified_at is null or not r.verified_purchase) then
  raise exception using errcode='22023',message='review_publication_evidence_required'; end if;
 if p_action='delete' then
  delete from public.reviews where id=p_review_id;
  v_version := r.version;
 else
  update public.reviews set
   status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'archive' then 'archived' when 'restore' then 'pending' else status end,
   is_approved=case when p_action='approve' then true when p_action in ('reject','archive','restore') then false else is_approved end,
   is_featured=case when p_action='feature' then true when p_action in ('approve','reject','archive','restore','unfeature') then false else is_featured end,
   moderation_reason=case when p_action='reject' then v_reason when p_action in ('approve','restore') then null else moderation_reason end,
   owner_response=case when p_action='respond' then v_response else owner_response end,
   owner_response_published=case when p_action='respond' then v_response is not null and coalesce(p_publish_response,false)
    when p_action in ('reject','archive','restore') then false else owner_response_published end,
   moderated_by=p_actor_id, moderated_at=now()
  where id=p_review_id returning version into v_version;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
 values(p_actor_id,'review.'||p_action,'review',p_review_id::text,jsonb_build_object('fromStatus',r.status,'fromVersion',r.version,'version',v_version,'hasReason',v_reason is not null));
 return jsonb_build_object('id',p_review_id,'version',v_version);
end $$;
revoke all on function public.manage_review_v2(uuid,uuid,text,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.manage_review_v2(uuid,uuid,text,integer,text,text,boolean) to service_role;

-- Delivered notification content cannot be rewritten through customer UPDATE.
revoke update on public.notifications from anon,authenticated;
-- Customer read receipts remain behind the audited RPC from 067.
create function public.admin_notification_history(p_actor_id uuid,p_customer_id uuid,p_request_id uuid default null,p_page integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_items jsonb; v_found uuid; v_total bigint;
begin
 if p_actor_id is null or public.has_permission('notifications.send',p_actor_id) is not true then
  raise exception using errcode='42501',message='notifications_send_permission_required'; end if;
 if p_customer_id is null or p_page is null or p_page<1 or p_page>100000 then raise exception 'notification_history_input_invalid'; end if;
 if p_request_id is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select id into v_found from public.notifications where admin_request_id=p_request_id and created_by=p_actor_id and user_id=p_customer_id;
 end if;
 select count(*) into v_total from public.notifications where user_id=p_customer_id;
 select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id desc),'[]'::jsonb) into v_items from (
  select id,title,body,kind,link,read_at,created_at from public.notifications where user_id=p_customer_id
  order by created_at desc,id desc limit 20 offset ((p_page-1)*20)
 ) n;
 return jsonb_build_object('items',v_items,'total',v_total,'requestFound',v_found);
end $$;
revoke all on function public.admin_notification_history(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.admin_notification_history(uuid,uuid,uuid,integer) to service_role;
