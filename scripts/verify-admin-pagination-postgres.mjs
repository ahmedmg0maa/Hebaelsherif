import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run}=isolatedPostgres(),tag=randomUUID(),actor=run("select user_id from public.admin_roles where role='owner' limit 1"),prefix='pagination-'+tag
const role=`set request.jwt.claims='{"role":"service_role"}';`
const oldAudit=run("select coalesce(json_agg(id),'[]') from public.audit_logs where action='customer.directory_page_viewed'")
const ids=Array.from({length:620},randomUUID),idList=ids.map(id=>`'${id}'`).join(',')
const call=(kind='customers',query=prefix,status='all',page=1)=>JSON.parse(run(role+`select public.admin_customer_directory_page('${actor}','${kind}','${query}','${status}',${page},25)`))
try{
 run(`insert into auth.users(id,email,aud,role,raw_user_meta_data,created_at,updated_at) select id,'${prefix}-'||n||'@example.invalid','authenticated','authenticated',jsonb_build_object('full_name','عميلة اختبار معزول '||n),now()+make_interval(secs=>n),now() from unnest(array[${idList}]::uuid[]) with ordinality as fixture(id,n);update public.profiles pr set created_at=au.created_at from auth.users au where pr.id=au.id and pr.id in (${idList});update public.profiles set full_name='اسم خاص ${tag}100%_حرفي' where id='${ids[0]}';`)
 const first=call();assert.equal(first.total,620);assert.equal(first.rows.length,25)
 const oldest=call('customers',prefix,'all',9999);assert.equal(oldest.page,25);assert.equal(oldest.rows.length,20);assert(oldest.rows.some(row=>row.id===ids[0]))
 assert.deepEqual(call('customers',tag+'100%_حرفي').rows.map(row=>row.id),[ids[0]])
 run(`insert into public.account_deletion_requests(user_id,subject_hash,status,requested_at) select id,md5(id::text)||md5(id::text),'declined',now()+make_interval(secs=>n) from unnest(array[${idList}]::uuid[]) with ordinality as fixture(id,n);`)
 const closed=call('deletions',prefix,'declined',25);assert.equal(closed.total,620);assert.equal(closed.rows.length,20)
 assert.equal(call('deletions',prefix,'pending').total,0)
 assert.throws(()=>run(role+`select public.admin_customer_directory_page(gen_random_uuid(),'customers','','all',1,25)`),/users_view_permission_required/)
 assert.equal(run("select has_function_privilege('anon','public.admin_customer_directory_page(uuid,text,text,text,integer,integer)','execute') or has_function_privilege('authenticated','public.admin_customer_directory_page(uuid,text,text,text,integer,integer)','execute')"),'f')
 assert.equal(run("select bool_and(reloptions @> array['security_invoker=true']) from pg_class where oid in ('public.admin_order_directory'::regclass,'public.admin_payment_directory'::regclass,'public.admin_subscription_directory'::regclass,'public.admin_content_revision_directory'::regclass)"),'t')
 // Execute the invoker view as an actual ordinary customer under RLS.
 const own=randomUUID(),other=randomUUID(),privateProduct=randomUUID()
 const visible=run(`begin;insert into public.orders(id,user_id,status,total) values('${own}','${ids[0]}','pending_payment',0),('${other}','${ids[1]}','pending_payment',0);insert into public.products(id,type,title,slug,price,is_published) values('${privateProduct}','book','منتج خاص للاختبار','qa-${privateProduct}',0,false);insert into public.order_items(order_id,product_id,unit_price,total) values('${own}','${privateProduct}',0,0);set local role authenticated;set local request.jwt.claims='{"role":"authenticated","sub":"${ids[0]}"}';select jsonb_build_object('ids',jsonb_agg(id),'titles',max(array_length(product_titles,1))) from public.admin_order_directory where id in ('${own}','${other}');rollback;`)
 assert.deepEqual(JSON.parse(visible).ids,[own]);assert.equal(JSON.parse(visible).titles,1,'Unavailable catalog rows must not erase an existing order item')

 run(`insert into public.user_notes(user_id,author_id,note,created_at) select '${ids[0]}','${actor}','${prefix} ملاحظة '||n,now()+make_interval(secs=>n) from generate_series(1,620) n;insert into public.user_notes(user_id,author_id,note) values('${ids[1]}','${actor}','${prefix} تخص حسابًا آخر');`)
 const history=(kind='notes',query=prefix,page=1)=>JSON.parse(run(role+`select public.admin_customer_history_page('${actor}','${ids[0]}','${kind}','${query}','all',${page},25)`))
 assert.equal(history().total,620);assert.equal(history('notes',prefix,25).rows.length,20)
 assert(history('notes',prefix,25).rows.some(row=>row.note.endsWith('ملاحظة 1')))
 assert.equal(history('notes','تخص حسابًا آخر').total,0)
 for(const kind of ['orders','payments','bookings','subscriptions','tags','notifications'])assert.equal(history(kind).total,0)
 assert.throws(()=>run(role+`select public.admin_customer_history_page(gen_random_uuid(),'${ids[0]}','notes','','all',1,25)`),/users_view_permission_required/)
 assert.equal(run("select has_function_privilege('authenticated','public.admin_customer_history_page(uuid,uuid,text,text,text,integer,integer)','execute')"),'f')
 assert.equal(run(`select count(*) from public.audit_logs where action='customer.history_page_viewed' and entity_id='${ids[0]}' and (meta::text like '%${prefix}%' or meta ? 'note')`),'0')
 console.log('PASS actual customer history: 620 notes including oldest, all seven history kinds, cross-customer isolation, permission denial and content-free audit')
 const audit=JSON.parse(run(`select coalesce(json_agg(meta),'[]') from public.audit_logs where action='customer.directory_page_viewed' and not(id=any(array(select jsonb_array_elements_text('${oldAudit}'::jsonb)::uuid)))`));assert(audit.length>=5);assert(!JSON.stringify(audit).includes(prefix));assert(!JSON.stringify(audit).includes('@'));assert(audit.every(row=>row.resultCount<=25))
 console.log('PASS PostgreSQL committed 620-customer directory: oldest page, exact count, literal search, historical closed deletion requests and reload')
 console.log('PASS ordinary customer RLS on invoker views; denied actors/browser RPC; privacy-safe persisted directory audit')
}catch(error){console.error('Directory test failed:',error.message);throw error}finally{
 run(`begin;delete from public.audit_logs where action='customer.directory_page_viewed' and not(id=any(array(select jsonb_array_elements_text('${oldAudit}'::jsonb)::uuid)));delete from public.audit_logs where actor_id in (${idList}) or entity_id in (select id::text from unnest(array[${idList}]::uuid[]) as fixture(id));delete from public.account_deletion_requests where user_id in (${idList});delete from auth.users where id in (${idList});commit;`)
}
