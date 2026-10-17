-- Keep registration and audit atomic. A lost reply/retry must never remove an
-- already registered object or create a second library item.
create function public.admin_register_media(p_actor uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.media_assets%rowtype; found_id uuid; object_meta jsonb;
begin
 if p_actor is null or not public.has_permission('media.manage',p_actor) then raise exception using errcode='42501',message='media_management_required';end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>65536 then raise exception 'media_metadata_invalid';end if;
 a:=jsonb_populate_record(null::public.media_assets,p_data);
 if a.bucket not in ('public-media','course-videos','course-resources','protected-books','workshop-recordings')
  or a.path !~ '^admin/\d{4}-\d{2}-\d{2}/[0-9a-f-]{36}-[^/]+$' or a.size_bytes is null or a.size_bytes<1 or a.size_bytes>50000000
  or (a.bucket='public-media' and a.size_bytes>10485760) or char_length(a.title)<1 or char_length(a.title)>180 then raise exception 'media_metadata_invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('media-register:'||a.bucket||':'||a.path,0));
 select id into found_id from public.media_assets where bucket=a.bucket and path=a.path;
 if found then
  if not exists(select 1 from public.media_assets where id=found_id and uploaded_by=p_actor) then raise exception using errcode='42501',message='media_actor_mismatch';end if;
  return found_id;
 end if;
 select metadata into object_meta from storage.objects where bucket_id=a.bucket and name=a.path;
 if not found or (object_meta->>'size')::bigint is distinct from a.size_bytes or object_meta->>'mimetype' is distinct from a.mime_type then raise exception 'media_object_unconfirmed';end if;
 insert into public.media_assets(bucket,path,title,alt,tags,kind,size_bytes,mime_type,original_name,visibility,uploaded_by,caption,credit,rights_status,rights_reference,folder,focal_x,focal_y,processing_status)
 values(a.bucket,a.path,a.title,a.alt,a.tags,a.kind,a.size_bytes,a.mime_type,a.original_name,case when a.bucket='public-media' then 'public' else 'private' end,p_actor,a.caption,a.credit,a.rights_status,a.rights_reference,a.folder,a.focal_x,a.focal_y,'original') returning id into found_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'media.uploaded','media_asset',found_id::text,jsonb_build_object('bucket',a.bucket,'kind',a.kind,'size',a.size_bytes));
 return found_id;
end $$;
revoke all on function public.admin_register_media(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_register_media(uuid,jsonb) to service_role;
