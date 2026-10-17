import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {applicationClient} from './admin-acceptance-http.mjs'
import {literal} from './admin-acceptance-db.mjs'
import {saveManifest} from './admin-acceptance-fixtures.mjs'
import {getUploadLimit,UPLOAD_LIMITS} from '../../src/lib/uploads/limits.mjs'
import {pdfFixture,pngFixture,movFixture} from './admin-acceptance-files.mjs'
export const CASE_IDS=['owner','admin','operations','finance','content','marketing','support','editor','analyst','auditor'].map(role=>'auth_'+role).concat(['auth_customer','auth_outsider','role_permissions_postgrest','saved_choices_old_names','save_reload_postgrest','restore_stale_and_concurrent','restore_atomic_failure','home_initialize_compare_edit','private_preview_access_and_expiry','paged_lists_literal_last_page','real_all_bucket_upload_boundaries','real_protected_upload_boundaries_retry','real_upload_missing_bytes_retry','entitled_customer_and_denial','logout_session_revocation'])
const form=values=>{const f=new FormData();for(const [key,value] of Object.entries(values))f.set(key,String(value));return f}
function providerSuccess(error){if(!error)return;const status=Number(error.status??error.statusCode);if(status===429)throw Error('PROVIDER_RATE_LIMITED');if(status===0||status>=500||/fetch failed|timeout|network/i.test(error.message??''))throw Error('PROVIDER_NETWORK_UNAVAILABLE');throw Error('PROVIDER_OPERATION_REJECTED')}
export async function acceptanceCases({config,query,service,fixture,runtime,report}){
 const {manifest:m,accounts}=fixture,clients=new Map(),context={config,manifest:runtime.manifest,basic:runtime.basic}
 const check=async(id,run)=>{try{await run();report.cases.push({id,status:'passed'})}catch(error){const code=/^[A-Z_0-9]+$/.test(error.message)?error.message:'ASSERTION_FAILED';report.cases.push({id,status:'failed',classification:/NETWORK|TIMEOUT|RATE_LIMITED/.test(code)?'environment_blocked':'behavioral_failure',code});throw Error('CASE_FAILED_'+id.toUpperCase())}}
 const read=async(table,id,columns='*')=>{const {data,error}=await service.from(table).select(columns).eq('id',id).single();assert(!error&&data);return data}
 const act=(client,file,name,path,args)=>client.action(file,name,path,args)
 for(const account of accounts.filter(a=>!['customer','outsider'].includes(a.role)))await check('auth_'+account.role,async()=>{const client=applicationClient(context);await client.login(account);const r=await client.request('/admin/overview');assert.equal(r.status,200);const reload=await client.request('/admin/overview');assert.equal(reload.status,200);clients.set(account.role,client);const sessions=await query(`select count(*)::int as count from public.admin_sessions where user_id=${literal(account.id)} and revoked_at is null and auth_session_id is not null`,{readOnly:true});assert(sessions[0].count>0)})
 const owner=clients.get('owner'),anonymous=applicationClient(context),editor=clients.get('editor'),support=clients.get('support')
 for(const role of ['customer','outsider'])await check('auth_'+role,async()=>{const a=accounts.find(a=>a.role===role),c=applicationClient(context),{error}=await c.auth.auth.signInWithPassword({email:a.email,password:a.password});providerSuccess(error);const verified=await c.auth.auth.getUser();providerSuccess(verified.error);assert.equal(verified.data.user?.id,a.id);clients.set(role,c)})
 await check('role_permissions_postgrest',async()=>{
  const matrix={owner:[true,true],admin:[true,true],operations:[false,false],finance:[false,false],content:[true,true],marketing:[true,true],support:[false,false],editor:[true,false],analyst:[false,false],auditor:[false,false],customer:[false,false],outsider:[false,false]}
  for(const [role,expected] of Object.entries(matrix))for(const [index,permission] of ['content.manage','content.publish'].entries()){const result=await clients.get(role).auth.rpc('has_permission',{permission_name:permission});assert(!result.error);assert.equal(result.data,expected[index])}
  const denied=await clients.get('outsider').request('/admin/pages');assert.notEqual(denied.status,200)
  const result=await act(support,'cms','saveCmsPage','/admin/pages',[m.pages[0],form({title:'محاولة تعديل مرفوضة',status:'draft'})]);assert.equal(result.ok,false)
 })
 await check('saved_choices_old_names',async()=>{
  await query(`update public.products set archived_at=now() where id=${literal(m.products[0])};select '{}'::json as result;`)
  try{for(const kind of ['product','bundle-child']){const r=await act(owner,'admin-choices','resolveAdminChoices','/admin/products',[kind,m.products]);assert(r.ok);assert.equal(r.items.length,2);assert(r.items.every(item=>item.label.includes('مصطنع')));assert.deepEqual(r.items.map(i=>i.id),m.products);assert.equal(r.items[0].state,'archived');assert.equal(r.items[1].state,'hidden')}}finally{await query(`update public.products set archived_at=null where id=${literal(m.products[0])};select '{}'::json as result;`)}
 })
 const pageId=m.pages[0]
 await check('save_reload_postgrest',async()=>{assert((await act(owner,'cms','saveCmsPage','/admin/pages',[pageId,form({title:'حفظ عربي مؤكد بعد التحديث',status:'draft',seo_title:'اختبار قبول'})])).ok);assert.equal((await read('pages',pageId)).title,'حفظ عربي مؤكد بعد التحديث');assert((await owner.request('/admin/pages?q='+encodeURIComponent('حفظ عربي مؤكد')).then(r=>r.text())).includes('حفظ عربي مؤكد بعد التحديث'))})
 await check('restore_stale_and_concurrent',async()=>{
  const prepared=await act(owner,'revisions','prepareContentRevisionRestore','/admin/revisions',[m.revision]);assert(prepared.ok)
  assert((await act(editor,'cms','saveCmsPage','/admin/pages',[pageId,form({title:'تعديل أحدث محفوظ',status:'draft'})])).ok)
  assert.equal((await act(owner,'revisions','restoreContentRevision','/admin/revisions',[m.revision,prepared.version])).ok,false);assert.equal((await read('pages',pageId)).title,'تعديل أحدث محفوظ')
  const fresh=await act(owner,'revisions','prepareContentRevisionRestore','/admin/revisions',[m.revision]);assert(fresh.ok)
  const results=await Promise.all([act(owner,'revisions','restoreContentRevision','/admin/revisions',[m.revision,fresh.version]),act(owner,'revisions','restoreContentRevision','/admin/revisions',[m.revision,fresh.version])]);assert.equal(results.filter(r=>r.ok).length,1)
  assert.equal((await read('pages',pageId)).title,'عنوان سابق مصطنع للاستعادة');assert.equal((await owner.request('/admin/pages?q='+encodeURIComponent('عنوان سابق مصطنع'))).status,200)
 })
 await check('restore_atomic_failure',async()=>{
  const before=await read('pages',pageId),trigger='qa_restore_'+m.id.replaceAll('-','')
  const checkpoint=await query(`select count(*)::int as count from public.content_revisions where entity_id=${literal(pageId)}`,{readOnly:true})
  await query(`create function heba_acceptance_control.${trigger}()returns trigger language plpgsql as $$begin if new.entity_id=${literal(pageId)} and new.action='content_revision.restored_as_draft' then raise exception 'qa_audit_failure';end if;return new;end $$;create trigger ${trigger} before insert on public.audit_logs for each row execute function heba_acceptance_control.${trigger}();select '{}'::json as result;`)
  try{const prepared=await act(owner,'revisions','prepareContentRevisionRestore','/admin/revisions',[m.revision]);assert(prepared.ok);const result=await act(owner,'revisions','restoreContentRevision','/admin/revisions',[m.revision,prepared.version]);assert.equal(result.ok,false);assert.deepEqual(await read('pages',pageId),before);assert.deepEqual(await query(`select count(*)::int as count from public.content_revisions where entity_id=${literal(pageId)}`,{readOnly:true}),checkpoint)}finally{await query(`drop trigger ${trigger} on public.audit_logs;drop function heba_acceptance_control.${trigger}();select '{}'::json as result;`)}
 })
 await check('home_initialize_compare_edit',async()=>{
  const publicBefore=await anonymous.request('/').then(r=>r.text()),r=await act(owner,'home-draft','initializeHomeDraft','/admin/pages');assert(r.ok&&r.created)
  const {data:home,error}=await service.from('pages').select('id,status').eq('slug','home').single();assert(!error&&home.status==='draft');m.home=home.id;await saveManifest(query,m)
  assert.equal((await owner.request('/admin/pages/home/compare')).status,200)
  const {data:hero}=await service.from('page_sections').select('id,name,sort,content').eq('page_id',home.id).eq('kind','hero').single();assert(hero)
  // Save through the same form contract as the Home editor, preserving original fields.
  const c=hero.content,f=form({kind:'hero',name:hero.name,sort:hero.sort,is_visible:'on'})
  // Hero fields are copied from the server snapshot rather than invented business text.
  for(const [key,value] of Object.entries(c)){if(typeof value==='string')f.set(key.replace(/[A-Z]/g,l=>'_'+l.toLowerCase()),value)}
  for(const [slot,ref] of Object.entries(c.media??{}))for(const [key,value] of Object.entries({id:ref.assetId,alt:ref.alt,x:ref.x,y:ref.y}))f.set(`media_${slot}_${key}`,String(value))
  f.set('lead','تعديل مسودة معزول لا يظهر في الرئيسية العامة.')
  const saved=await act(owner,'cms','saveHomeSection','/admin/pages',[home.id,hero.id,f]);assert(saved.ok);assert.equal((await read('page_sections',hero.id)).content.lead,f.get('lead'))
  assert.equal((await act(owner,'home-draft','initializeHomeDraft','/admin/pages')).created,false)
  const publicAfter=await anonymous.request('/').then(r=>r.text());assert(!publicBefore.includes(f.get('lead'))&&!publicAfter.includes(f.get('lead')))
 })
 await check('private_preview_access_and_expiry',async()=>{
  const saved=await act(owner,'cms','savePageSection','/admin/pages',[pageId,null,form({name:'قسم قبول',kind:'rich_text',sort:0,is_visible:'on',content:JSON.stringify({heading:'عنوان معاينة محفوظ',body:'نص معاينة أصلي محفوظ في قاعدة الاختبار.'})})]);assert(saved.ok)
  const grant=await act(owner,'cms','createContentPreview','/admin/pages',['page',pageId]);assert(grant.ok)
  const response=await anonymous.request(grant.url),body=await response.text();assert.equal(response.status,200);assert(body.includes('عنوان معاينة محفوظ'));assert(response.headers.get('cache-control')?.includes('no-store'))
  const ungranted=await anonymous.request(`/preview/page/${pageId}`);assert(!(await ungranted.text()).includes('عنوان معاينة محفوظ'))
  const tampered=grant.url.replace(/token=[^&]+/,'token='+'0'.repeat(64));assert(!(await anonymous.request(tampered).then(r=>r.text())).includes('عنوان معاينة محفوظ'))
  const wrongEntity=grant.url.replace(pageId,m.pages[2]);assert(!(await anonymous.request(wrongEntity).then(r=>r.text())).includes('عنوان معاينة محفوظ'))
  const denied=await act(support,'cms','createContentPreview','/admin/pages',['page',pageId]);assert.equal(denied.ok,false)
  const token=new URL(grant.url,config.origin).searchParams.get('token'),hash=createHash('sha256').update(token).digest('hex')
  // Advance only this owned grant's database deadline; no clock/auth/provider mock.
  await query(`update public.content_preview_tokens set expires_at=now()-interval '1 second' where entity_id=${literal(pageId)} and token_hash=${literal(hash)};select '{}'::json as result;`)
  const expired=await anonymous.request(grant.url);assert(!(await expired.text()).includes('عنوان معاينة محفوظ'))
 })
 await check('paged_lists_literal_last_page',async()=>{
  const literalResult=await act(owner,'admin-choices','searchAdminChoices','/admin/products',['product','100%_',1]);assert(literalResult.ok&&literalResult.total===0)
  // Match the actual page's title filter and slug/id ordering. Page zero's title
  // was intentionally changed by restore, leaving 52 matching synthetic rows.
  const result=await owner.auth.from('pages').select('id',{count:'exact'}).ilike('title','%'+m.prefix+'%').order('slug').order('id').range(50,74);assert(!result.error);assert.equal(result.count,52);assert.equal(result.data.length,2)
  const literalPages=await owner.auth.from('pages').select('id',{count:'exact'}).ilike('title','%100\\%\\_%');assert(!literalPages.error);assert.equal(literalPages.count,1)
  const last=await owner.request('/admin/pages?q='+encodeURIComponent(m.prefix)+'&page=99999');assert.equal(last.status,200);const body=await last.text();assert(result.data.every(row=>body.includes(row.id)))
  const exactHtml=await owner.request('/admin/pages?q='+encodeURIComponent('100%_')).then(r=>r.text());assert(exactHtml.includes(m.pages[1]));assert(!exactHtml.includes(m.pages[2]))
  const found=await owner.auth.from('pages').select('id').ilike('slug','%'+m.prefix+'%');assert(!found.error)
  const denied=await clients.get('outsider').auth.from('pages').select('id').in('id',m.pages);assert(!denied.error);assert.equal(denied.data.length,0)
 })
 async function upload(kind,entity,size){
  const start=await act(owner,'delivery-admin','beginProtectedUpload',`/admin/courses/${m.course}/curriculum`,[kind,entity,{name:'acceptance.pdf',type:'application/pdf',size}]);assert(start.ok)
  m.objects.push({bucket:start.data.bucket,path:start.data.path});await saveManifest(query,m)
  const bytes=pdfFixture(size)
  const sent=await owner.auth.storage.from(start.data.bucket).uploadToSignedUrl(start.data.path,start.data.token,bytes,{contentType:'application/pdf'});providerSuccess(sent.error)
  const input={intentId:start.data.intentId,path:start.data.path,title:'ملف قبول مصطنع',format:'qa-'+m.id.slice(0,8)}
  const finish=await act(owner,'delivery-admin','finalizeProtectedUpload',`/admin/courses/${m.course}/curriculum`,[kind,entity,input]);assert(finish.ok)
  const retry=await act(owner,'delivery-admin','finalizeProtectedUpload',`/admin/courses/${m.course}/curriculum`,[kind,entity,input]);assert(retry.ok);assert.equal(retry.data.id,finish.data.id)
  return {id:finish.data.id,bytes,bucket:start.data.bucket,path:start.data.path}
 }
 let bookFile
 await check('real_all_bucket_upload_boundaries',async()=>{
  for(const [bucket,cap] of Object.entries(UPLOAD_LIMITS)){
  const image=bucket==='public-media',video=['course-videos','workshop-recordings'].includes(bucket),make=image?pngFixture:video?movFixture:pdfFixture
  const input={bucket,name:image?'acceptance.png':video?'acceptance.mov':'acceptance.pdf',type:image?'image/png':video?'video/quicktime':'application/pdf',title:'ملف قبول أصلي مصطنع',alt:'بكسل كريمي للاختبار المعزول',rightsStatus:'owned',rightsReference:'Original synthetic QA fixture',size:cap+1}
  assert.equal((await act(owner,'admin-control','beginMediaUpload','/admin/media',[input])).ok,false)
  for(const size of [cap-1,cap]){
   input.size=size;const start=await act(owner,'admin-control','beginMediaUpload','/admin/media',[input]);assert(start.ok);m.objects.push({bucket:start.data.bucket,path:start.data.path});await saveManifest(query,m)
   const sent=await owner.auth.storage.from(start.data.bucket).uploadToSignedUrl(start.data.path,start.data.token,make(size),{contentType:input.type});providerSuccess(sent.error)
   const saved=await act(owner,'admin-control','finalizeMediaUpload','/admin/media',[{...input,path:start.data.path}]);assert(saved.ok);m.media.push(saved.id);await saveManifest(query,m);assert.equal((await read('media_assets',saved.id)).size_bytes,size)
   const direct=await fetch(`${config.url}/storage/v1/object/public/${bucket}/${start.data.path}`,{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(30000)});if(image){assert(direct.ok);assert.equal(Buffer.from(await direct.arrayBuffer()).subarray(1,4).toString(),'PNG')}else{assert(!direct.ok);await direct.body?.cancel();const denied=await clients.get('outsider').auth.storage.from(bucket).download(start.data.path);assert(denied.error&&!denied.data)}
  }
  const overflowPath=`admin/acceptance/${randomUUID()}-${input.name}`;m.objects.push({bucket,path:overflowPath});await saveManifest(query,m)
  const rejected=await service.storage.from(bucket).upload(overflowPath,make(cap+1),{contentType:input.type});assert(rejected.error&&/maximum allowed size|exceed.*size|payload too large/i.test(rejected.error.message))
  }
 })
 await check('real_protected_upload_boundaries_retry',async()=>{
  const cap=getUploadLimit('protected-books')
  const above=await act(owner,'delivery-admin','beginProtectedUpload',`/admin/courses/${m.course}/curriculum`,['book',m.book,{name:'too-large.pdf',type:'application/pdf',size:cap+1}]);assert.equal(above.ok,false)
  await upload('lesson-resource',m.lesson,cap-1);bookFile=await upload('book',m.book,cap)
  const anonymousStorage=await fetch(`${config.url}/storage/v1/object/public/${bookFile.bucket}/${bookFile.path}`);assert(!anonymousStorage.ok)
  const overflowPath=`book/${m.book}/${randomUUID()}.pdf`;m.objects.push({bucket:'protected-books',path:overflowPath});await saveManifest(query,m)
  const overflow=await service.storage.from('protected-books').upload(overflowPath,Buffer.alloc(cap+1),{contentType:'application/pdf'});assert(overflow.error)
 })
 await check('real_upload_missing_bytes_retry',async()=>{
  const start=await act(owner,'delivery-admin','beginProtectedUpload',`/admin/courses/${m.course}/curriculum`,['lesson-resource',m.lesson,{name:'retry.pdf',type:'application/pdf',size:1024}]);assert(start.ok);m.objects.push({bucket:start.data.bucket,path:start.data.path});await saveManifest(query,m)
  const input={intentId:start.data.intentId,path:start.data.path,title:'إعادة محاولة قبول'}
  assert.equal((await act(owner,'delivery-admin','finalizeProtectedUpload',`/admin/courses/${m.course}/curriculum`,['lesson-resource',m.lesson,input])).ok,false)
  const r=await owner.auth.storage.from(start.data.bucket).uploadToSignedUrl(start.data.path,start.data.token,pdfFixture(1024),{contentType:'application/pdf'});assert(!r.error)
  assert((await act(owner,'delivery-admin','finalizeProtectedUpload',`/admin/courses/${m.course}/curriculum`,['lesson-resource',m.lesson,input])).ok)
 })
 await check('entitled_customer_and_denial',async()=>{
  // A synthetic zero-price entitlement fixture; no financial policy or payment simulation.
  const customer=accounts.find(a=>a.role==='customer')
  await query(`insert into public.book_access(user_id,book_id)values(${literal(customer.id)},${literal(m.book)});select '{}'::json as result;`)
  const path=`/dashboard/books/${m.prefix}-book/download`
  const allowed=await clients.get('customer').request(path);assert([302,303,307].includes(allowed.status));const target=allowed.headers.get('location');assert.equal(new URL(target).hostname,new URL(config.url).hostname)
  const downloaded=await fetch(target);assert(downloaded.ok);const hash=bytes=>createHash('sha256').update(bytes).digest('hex');assert.equal(hash(Buffer.from(await downloaded.arrayBuffer())),hash(bookFile.bytes))
  assert.notEqual((await clients.get('outsider').request(path)).status,302)
  const denied=await clients.get('outsider').request(path);assert(!denied.headers.get('location')?.includes('/storage/'))
  const {data,error}=await clients.get('outsider').auth.storage.from(bookFile.bucket).download(bookFile.path);assert(error&&!data)
 })
 await check('logout_session_revocation',async()=>{assert((await act(owner,'admin-sessions','logoutCurrentAdminSession','/admin/overview')).ok);assert.notEqual((await owner.request('/admin/overview')).status,200);assert.notEqual((await owner.request('/admin/pages')).status,200);const rows=await query(`select count(*)::int as count from public.admin_sessions where user_id=${literal(accounts[0].id)} and revoked_at is null`,{readOnly:true});assert.equal(rows[0].count,0)})
}
