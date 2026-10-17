import {randomUUID,randomBytes} from 'node:crypto'
import {literal} from './admin-acceptance-db.mjs'
export const STAFF_ROLES=['owner','admin','operations','finance','content','marketing','support','editor','analyst','auditor']
export function newFixtureManifest(ref){const id=randomUUID(),prefix='qa-'+id;return {id,ref,prefix,users:[],pages:Array.from({length:53},()=>randomUUID()),revision:randomUUID(),products:[randomUUID(),randomUUID()],course:randomUUID(),module:randomUUID(),lesson:randomUUID(),book:randomUUID(),home:null,objects:[],media:[],orders:[]}}
export async function saveManifest(query,m){await query(`update heba_acceptance_control.runs set manifest=${literal(JSON.stringify(m))}::jsonb where id=${literal(m.id)};select '{}'::json as result;`)}
export async function seedFixtures(config,query,service){
 const m=newFixtureManifest(config.ref),accounts=[]
 const checks=await query("select jsonb_build_object('owned',exists(select 1 from heba_acceptance_control.project),'active',(select count(*) from heba_acceptance_control.runs where cleaned_at is null),'home',(select count(*) from public.pages where slug='home')) as state",{readOnly:true}),state=checks[0]?.state
 if(!state?.owned||state.active||state.home)throw Error('TEST_PROJECT_BUSY_OR_EXISTING_HOME')
 await query(`begin;lock table heba_acceptance_control.runs in exclusive mode;do $$begin if exists(select 1 from heba_acceptance_control.runs where cleaned_at is null)then raise exception 'test_run_active';end if;end $$;insert into heba_acceptance_control.runs(id,manifest)values(${literal(m.id)},${literal(JSON.stringify(m))}::jsonb);commit;select '{}'::json as result;`)
 try{
  for(const role of [...STAFF_ROLES,'customer','outsider']){
   const email=`${m.prefix}-${role}@example.invalid`,password=randomBytes(30).toString('base64url')+'aA1!'
   const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'حساب قبول مصطنع '+role,heba_acceptance_run:m.id}})
   if(error||!data.user?.id)throw Error('TEST_AUTH_ACCOUNT_CREATE_FAILED')
   const account={id:data.user.id,email,password,role};accounts.push(account);m.users.push({id:account.id,email,role});await saveManifest(query,m)
   if(STAFF_ROLES.includes(role))await query(`insert into public.admin_roles(user_id,role)values(${literal(account.id)},${literal(role)});${role==='owner'?`insert into public.owner_password_access(user_id,enabled)values(${literal(account.id)},true);`:''}select '{}'::json as result;`)
  }
  const owner=accounts[0].id
  await query(`begin;${m.pages.map((id,index)=>`insert into public.pages(id,slug,title,status,is_published)values(${literal(id)},${literal(m.prefix+'-'+index)},${literal(m.prefix+(index===1?' 100%_حرفي':' صفحة '+index))},'draft',false);`).join('')}
   insert into public.content_revisions(id,entity_type,entity_id,snapshot,created_by)select ${literal(m.revision)},'page',id,to_jsonb(p)||jsonb_build_object('title','عنوان سابق مصطنع للاستعادة'),${literal(owner)} from public.pages p where id=${literal(m.pages[0])};
   insert into public.products(id,type,slug,title,description,price,is_published)values(${literal(m.products[0])},'course',${literal(m.prefix+'-course')},'كورس قبول مصطنع','محتوى اختبار أصلي معزول لا يستخدم بيانات الإنتاج.',0,false),(${literal(m.products[1])},'book',${literal(m.prefix+'-book')},'كتاب قبول مصطنع','ملف اختبار أصلي معزول لا يستخدم ملفات الإنتاج.',0,false);
   insert into public.courses(id,product_id,slug,title,description)values(${literal(m.course)},${literal(m.products[0])},${literal(m.prefix+'-course')},'كورس قبول مصطنع','محتوى اختبار أصلي لفحص الحفظ والوصول.');
   insert into public.course_modules(id,course_id,title,sort)values(${literal(m.module)},${literal(m.course)},'وحدة قبول مصطنعة',1);
   insert into public.course_lessons(id,module_id,title,description,sort)values(${literal(m.lesson)},${literal(m.module)},'درس قبول مصطنع','نص أصلي مصطنع لفحص حقوق الوصول بعد الحفظ والتحديث.',1);
   insert into public.books(id,product_id,slug,title,description)values(${literal(m.book)},${literal(m.products[1])},${literal(m.prefix+'-book')},'كتاب قبول مصطنع','ملف اختبار معزول أصلي دون بيانات عميلات.');commit;select '{}'::json as result;`)
  return {manifest:m,accounts}
 }catch(error){error.fixtureManifest=m;throw error}
}
const identifier=value=>{if(!/^[a-z_][a-z0-9_]*$/.test(value))throw Error('CLEANUP_IDENTIFIER_INVALID');return '"'+value+'"'}
/** Discover only FK descendants of the exact run's roots. Never truncate or delete by broad prefix. */
export async function cleanupFixtures(config,query,service,m){
 if(!/^[a-f0-9-]{36}$/.test(m.id))throw Error('CLEANUP_RUN_INVALID')
 const saved=await query(`select manifest from heba_acceptance_control.runs where id=${literal(m.id)} and exists(select 1 from heba_acceptance_control.project where ref=${literal(config.ref)})`,{readOnly:true})
 m=saved[0]?.manifest
 if(!m||m.ref!==config.ref||m.prefix!=='qa-'+m.id)throw Error('CLEANUP_PROJECT_OR_MARKER_MISMATCH')
 // Recover an Auth account if the process stopped between createUser and the
 // manifest update. Only exact generated addresses AND the run metadata qualify.
 for(let page=1;page<=100;page++){
  const {data,error}=await service.auth.admin.listUsers({page,perPage:100});if(error)throw Error('CLEANUP_AUTH_DISCOVERY_FAILED')
  for(const user of data.users){if(user.user_metadata?.heba_acceptance_run!==m.id)continue;const role=[...STAFF_ROLES,'customer','outsider'].find(role=>user.email===`${m.prefix}-${role}@example.invalid`);if(!role)throw Error('CLEANUP_USER_NOT_OWNED');if(!m.users.some(row=>row.id===user.id))m.users.push({id:user.id,email:user.email,role})}
  if(data.users.length<100)break;if(page===100)throw Error('CLEANUP_SCOPE_TOO_LARGE')
 }
 const ids=[...m.users.map(u=>u.id),...m.pages,...m.products,...m.media,...[m.course,m.module,m.lesson,m.book],...(m.home?[m.home]:[])]
 if(ids.some(id=>!/^[a-f0-9-]{36}$/.test(id)))throw Error('CLEANUP_ID_INVALID')
 for(const user of m.users){const {data,error}=await service.auth.admin.getUserById(user.id);if(error&&error.status!==404)throw Error('CLEANUP_IDENTITY_CHECK_FAILED');if(data?.user&&(data.user.email!==user.email||data.user.user_metadata?.heba_acceptance_run!==m.id))throw Error('CLEANUP_USER_NOT_OWNED')}
 if(m.users.length){
  const actorIds=m.users.map(u=>literal(u.id)).join(','),entities=[m.book,m.lesson].map(literal).join(',')
  const recovered=await query(`select jsonb_build_object('objects',(select coalesce(jsonb_agg(jsonb_build_object('bucket',case upload_kind when 'book' then 'protected-books' when 'lesson-resource' then 'course-resources' when 'lesson-video' then 'course-videos' end,'path',storage_path)),'[]') from public.protected_upload_intents where actor_id in(${actorIds}) and entity_id in(${entities})),'home',(select page_id from public.home_draft_baselines where captured_by in(${actorIds}) limit 1),'media',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket',bucket,'path',path)),'[]') from public.media_assets where uploaded_by in(${actorIds}))) as recovery`,{readOnly:true})
  for(const object of recovered[0].recovery.objects){if(!m.objects.some(row=>row.bucket===object.bucket&&row.path===object.path))m.objects.push(object)}
  for(const asset of recovered[0].recovery.media){if(!m.media.includes(asset.id))m.media.push(asset.id);if(!m.objects.some(row=>row.bucket===asset.bucket&&row.path===asset.path))m.objects.push({bucket:asset.bucket,path:asset.path})}
  m.home??=recovered[0].recovery.home
  await saveManifest(query,m)
 }
 const trigger='qa_restore_'+m.id.replaceAll('-','')
 await query(`drop trigger if exists ${trigger} on public.audit_logs;drop function if exists heba_acceptance_control.${trigger}();select '{}'::json as result;`)
 for(const object of m.objects){if(!['public-media','protected-books','course-resources','course-videos','workshop-recordings'].includes(object.bucket)||typeof object.path!=='string'||object.path.includes('..'))throw Error('CLEANUP_OBJECT_INVALID');const result=await service.storage.from(object.bucket).remove([object.path]);if(result.error)throw Error('CLEANUP_STORAGE_FAILED')}
 if(m.objects.length){const remaining=await query(`select count(*)::int as count from storage.objects where ${m.objects.map(object=>`(bucket_id=${literal(object.bucket)} and name=${literal(object.path)})`).join(' or ')}`,{readOnly:true});if(remaining[0]?.count!==0)throw Error('CLEANUP_STORAGE_NOT_CONFIRMED')}
 const roots=new Map([['auth.users',new Set(m.users.map(u=>u.id))],['public.pages',new Set([...m.pages,...(m.home?[m.home]:[])])],['public.products',new Set(m.products)],['public.media_assets',new Set(m.media)]])
 const rows=await query(`select coalesce(jsonb_agg(jsonb_build_object('child',cn.nspname||'.'||c.relname,'parent',pn.nspname||'.'||p.relname,'column',ca.attname,'nullable',not ca.attnotnull,'has_id',exists(select 1 from pg_attribute where attrelid=c.oid and attname='id' and not attisdropped))),'[]') as edges from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace cn on cn.oid=c.relnamespace join pg_class p on p.oid=f.confrelid join pg_namespace pn on pn.oid=p.relnamespace join pg_attribute ca on ca.attrelid=c.oid and ca.attnum=f.conkey[1] join pg_attribute pa on pa.attrelid=p.oid and pa.attnum=f.confkey[1] where f.contype='f' and array_length(f.conkey,1)=1 and cn.nspname='public' and pa.attname='id'`,{readOnly:true}),edges=rows[0]?.edges??[],predicates=new Map()
 for(let pass=0;pass<30;pass++){
  let changed=false
  for(const edge of edges){const ids=roots.get(edge.parent);if(!ids?.size)continue;const [schema,table]=edge.child.split('.'),predicate=`${identifier(edge.column)}::text=any(array[${[...ids].map(literal).join(',')}]::text[])`;
   if(edge.has_id){const result=await query(`select coalesce(jsonb_agg(id::text),'[]') as ids from ${identifier(schema)}.${identifier(table)} where ${predicate}`,{readOnly:true}),found=result[0]?.ids??[],known=roots.get(edge.child)||new Set();if(!found.length)continue;predicates.set(edge.child,(predicates.get(edge.child)||new Set()).add(predicate));for(const id of found){if(!known.has(id)){known.add(id);changed=true}}if(known.size>10000)throw Error('CLEANUP_SCOPE_TOO_LARGE');roots.set(edge.child,known)}else{const result=await query(`select exists(select 1 from ${identifier(schema)}.${identifier(table)} where ${predicate}) as found`,{readOnly:true});if(result[0]?.found)predicates.set(edge.child,(predicates.get(edge.child)||new Set()).add(predicate))}
  }if(!changed)break;if(pass===29)throw Error('CLEANUP_SCOPE_NOT_STABLE')
 }
 const ordered=[],visiting=new Set(),visited=new Set()
 function visit(table){if(visited.has(table))return;if(visiting.has(table))throw Error('CLEANUP_FK_CYCLE_REQUIRES_REVIEW');visiting.add(table);for(const edge of edges)if(edge.parent===table&&predicates.has(edge.child)&&!(edge.nullable&&edge.has_id))visit(edge.child);visiting.delete(table);visited.add(table);if(table.startsWith('public.'))ordered.push(table)}
 for(const table of new Set([...roots.keys(),...predicates.keys()]))visit(table)
 let sql='begin;set local lock_timeout=\'10s\';'
 for(const edge of edges){const parent=roots.get(edge.parent),child=roots.get(edge.child);if(!edge.nullable||!edge.has_id||!parent?.size||!child?.size)continue;const [schema,table]=edge.child.split('.');sql+=`update ${identifier(schema)}.${identifier(table)} set ${identifier(edge.column)}=null where id::text=any(array[${[...child].map(literal).join(',')}]::text[]) and ${identifier(edge.column)}::text=any(array[${[...parent].map(literal).join(',')}]::text[]);`}
 for(const table of ordered){const [schema,name]=table.split('.'),ids=roots.get(table),where=[...(predicates.get(table)||[])];if(ids?.size)where.push(`id::text=any(array[${[...ids].map(literal).join(',')}]::text[])`);if(where.length)sql+=`delete from ${identifier(schema)}.${identifier(name)} where ${where.map(p=>'('+p+')').join(' or ')};`}
 sql+="commit;select '{}'::json as result;";await query(sql)
 for(const user of m.users){const result=await service.auth.admin.deleteUser(user.id);if(result.error&&result.error.status!==404)throw Error('CLEANUP_AUTH_DELETE_FAILED')}
 for(const user of m.users){const result=await service.auth.admin.getUserById(user.id);if(result.data?.user||result.error&&result.error.status!==404)throw Error('CLEANUP_AUTH_NOT_CONFIRMED')}
 await query(`update heba_acceptance_control.runs set cleaned_at=now() where id=${literal(m.id)};select '{}'::json as result;`)
 return {run:m.id,cleaned:true,users:m.users.length,objects:m.objects.length,scopedTables:ordered.length}
}
