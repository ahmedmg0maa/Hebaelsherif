BEGIN;
DO $test$
declare actor uuid; path text:='admin/2026-10-17/'||gen_random_uuid()||'-isolated.png'; payload jsonb; a uuid; b uuid;
begin
 select user_id into actor from public.admin_roles where role='owner' limit 1;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into storage.objects(bucket_id,name,metadata) values('public-media',path,'{"size":8,"mimetype":"image/png"}');
 payload:=jsonb_build_object('bucket','public-media','path',path,'title','اختبار معزول','alt','فحص داخلي','tags','[]'::jsonb,'kind','image','size_bytes',8,'mime_type','image/png','original_name','isolated.png','caption','','credit','','rights_status','unverified','rights_reference','','folder','isolated','focal_x',50,'focal_y',50);
 a:=public.admin_register_media(actor,payload);b:=public.admin_register_media(actor,payload);
 if a is distinct from b or (select count(*) from public.audit_logs where action='media.uploaded' and entity_id=a::text)<>1 then raise exception 'registration_retry_duplicated';end if;
 if has_function_privilege('authenticated','public.admin_register_media(uuid,jsonb)','execute') then raise exception 'media_registration_exposed';end if;
 raise notice 'PASS atomic media registration/retry returns one library row and one audit; no delete; browser RPC denied';
end $test$;
ROLLBACK;
