import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {UPLOAD_LIMITS} from '../src/lib/uploads/limits.mjs'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run}=isolatedPostgres(),actor=run("select user_id from public.admin_roles where role='owner' limit 1"),[product,book]=[randomUUID(),randomUUID()]
const role=`set request.jwt.claims='{"role":"service_role"}';`,paths=[],ids=[]
try{
 run(`insert into public.products(id,type,title,slug,price) values('${product}','book','isolated upload boundaries','qa-${product}',0);insert into public.books(id,product_id,title,slug) values('${book}','${product}','isolated upload','qa-${book}');`)
 for(const [bucket,max] of Object.entries(UPLOAD_LIMITS)){
  assert.equal(Number(run(`select public.app_upload_max_bytes('${bucket}')`)),max)
  assert.equal(Number(run(`select file_size_limit from storage.buckets where id='${bucket}'`)),max)
  for(const delta of [-1,0,1]){
   const path=`admin/2026-10-17/${randomUUID()}-boundary.pdf`;paths.push([bucket,path])
   run(`insert into storage.objects(bucket_id,name,metadata) values('${bucket}','${path}','{"size":${max+delta},"mimetype":"application/pdf"}')`)
   const call=role+`select public.admin_register_media('${actor}','{"bucket":"${bucket}","path":"${path}","title":"isolated boundary","kind":"document","size_bytes":${max+delta},"mime_type":"application/pdf","uploaded_by":"${actor}","alt":"isolated file","tags":[],"original_name":"boundary.pdf","rights_status":"owned","rights_reference":"isolated fixture","folder":"isolated","focal_x":50,"focal_y":50,"caption":"","credit":""}'::jsonb)`
   if(delta>0)assert.throws(()=>run(call),/media_metadata_invalid/)
   else{const id=run(call);ids.push(id);assert.equal(run(`select size_bytes from public.media_assets where id='${id}'`),String(max+delta))}
  }
 }
 for(const delta of [-1,0,1]){
  const path=`book/${book}/${randomUUID()}.pdf`,call=role+`select public.begin_protected_upload_intent('${actor}','book','${book}','${path}',encode(extensions.digest('${path}','sha256'),'hex'),'application/pdf',${UPLOAD_LIMITS['protected-books']+delta})`
  if(delta>0)assert.throws(()=>run(call),/protected_upload_declaration_invalid/)
  else{const id=run(call);assert.equal(run(`select declared_size from public.protected_upload_intents where id='${id}'`),String(UPLOAD_LIMITS['protected-books']+delta))}
 }
 for(const name of ['begin_protected_upload_intent_before_110(uuid,text,uuid,text,text,text,bigint)','bind_validated_protected_upload_before_110(uuid,uuid,text,text,text,bigint,text,boolean)'])assert.equal(run(`select has_function_privilege('service_role','public.${name}','execute')`),'f')
 console.log('PASS actual PostgreSQL media registration and protected intents: below/at accepted and persisted, above rejected; bucket caps match')
 console.log('PASS internal pre-limit functions cannot be called by the service role directly; no remote Storage transfer was performed')
}finally{
 run(`begin;set local storage.allow_delete_query='true';delete from public.audit_logs where entity_id in (${[...ids,book].map(x=>`'${x}'`).join(',')}) or meta->>'intentId' in (select id::text from public.protected_upload_intents where entity_id='${book}');delete from public.media_assets where id in (${ids.length?ids.map(x=>`'${x}'`).join(','):'null'});delete from public.protected_upload_intents where entity_id='${book}';delete from public.books where id='${book}';delete from public.products where id='${product}';${paths.map(([b,p])=>`delete from storage.objects where bucket_id='${b}' and name='${p}';`).join('')}commit;`)
}
