import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {catalogFixtureSQL,catalogPayload,actor,editor} from './catalog-test-fixture.mjs'
if(!process.env.HEBA_TEST_PGLITE_PATH)throw Error('Set HEBA_TEST_PGLITE_PATH; this test uses synthetic local fixtures, never a provider.')
const {PGlite}=await import(pathToFileURL(process.env.HEBA_TEST_PGLITE_PATH).href)
const db=new PGlite();let count=0
const check=async(name,fn)=>{await fn();count++;console.log(`PASS ${name}`)}
const read=name=>readFileSync(`supabase/migrations/${name}`,'utf8')
const q=async(sql,args=[])=>(await db.query(sql,args)).rows
const one=async(sql,args=[])=>(await q(sql,args))[0]
const create=async(kind)=>(await one("select manage_catalog_item($1,$2,null,'save',$3) r",[actor,kind,catalogPayload(kind)])).r
const mutate=async(kind,id,action,expected=null,user=actor)=>(await one('select manage_catalog_lifecycle($1,$2,$3,$4,$5) r',[user,kind,id,action,expected])).r
const snapshot=async()=>{const result={};for(const t of ['products','courses','books','services','workshops','media_usages','content_revisions','audit_logs','order_items','content_access'])result[t]=await q(`select to_jsonb(t) r from ${t} t order by to_jsonb(t)::text`);return result}
const unchanged=async(fn,pattern)=>{const before=await snapshot();await assert.rejects(fn,pattern);assert.deepEqual(await snapshot(),before)}
try{
 await db.exec(catalogFixtureSQL())
 await db.exec(read('086_atomic_catalog_editor_local_only.sql'))
 await db.exec(read('095_catalog_archival_local_only.sql'))
 const items={}
 for(const kind of ['course','book','workshop','service']){
   items[kind]=await create(kind)
   await check(`${kind}: archive withdraws both records without deleting delivery/media`,async()=>{
     const row=items[kind];const media=await q('select * from media_usages order by id')
     await mutate(kind,row.id,'archive')
     const product=await one('select * from products where id=$1',[row.productId]);assert(product.archived_at);assert.equal(product.is_published,false)
     const domain=await one(`select * from ${kind==='service'?'services':kind+'s'} where id=$1`,[row.id]);assert.equal(domain[kind==='service'?'is_active':'is_published'],false)
     assert.deepEqual(await q('select * from media_usages order by id'),media)
   })
   await check(`${kind}: stale restore and legacy save/publication cannot bypass archive`,async()=>{
     const row=items[kind];await unchanged(()=>mutate(kind,row.id,'restore'),/catalog_lifecycle_stale/)
     await unchanged(()=>db.query("select manage_catalog_item($1,$2,$3,'save',$4)",[actor,kind,row.id,catalogPayload(kind)]),/catalog_restore_required/)
     await unchanged(()=>db.query("select manage_catalog_item($1,$2,$3,'publication','{\"is_published\":true}')",[actor,kind,row.id]),/catalog_restore_required|archived_product_unpublished/)
   })
   await check(`${kind}: restore is audited and stays unpublished`,async()=>{
     const row=items[kind],p=await one('select archived_at::text stamp from products where id=$1',[row.productId])
     await mutate(kind,row.id,'restore',p.stamp)
     assert.deepEqual(await one('select archived_at,is_published from products where id=$1',[row.productId]),{archived_at:null,is_published:false})
     assert.equal(Number((await one("select count(*) n from audit_logs where entity_id=$1 and action='catalog.restore'",[row.id])).n),1)
   })
 }
 await check('archive needs management and publication permissions for a live item',async()=>{
   await db.query('update products set is_published=true where id=$1',[items.book.productId])
   await unchanged(()=>mutate('book',items.book.id,'archive',null,editor),/catalog_publish_required/)
   await unchanged(()=>mutate('book',items.book.id,'archive',null,'10000000-0000-4000-8000-000000000099'),/catalog_permission_required/)
 })
 await check('archive preserves order/entitlement history; permanent delete remains denied',async()=>{
   await db.query('insert into order_items(product_id) values($1)',[items.book.productId]);await db.query('insert into content_access(product_id) values($1)',[items.book.productId])
   await mutate('book',items.book.id,'archive')
   assert.equal((await q('select * from content_access')).length,1);assert.equal((await q('select * from order_items')).length,1)
   await unchanged(()=>db.query("select manage_catalog_item($1,'book',$2,'delete')",[actor,items.book.id]),/catalog_history_exists/)
 })
 await check('audit failure rolls back withdrawal and revision together',async()=>{
   await db.exec("create function fixture_fail_audit()returns trigger language plpgsql as $$begin raise exception 'synthetic_audit_failure';end$$;create trigger fixture_audit before insert on audit_logs for each row execute function fixture_fail_audit();")
   await unchanged(()=>mutate('course',items.course.id,'archive'),/synthetic_audit_failure/)
   await db.exec('drop trigger fixture_audit on audit_logs;')
 })
 await check('browser roles cannot call lifecycle RPC or edit catalog directly',async()=>{
   for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);try{await assert.rejects(()=>mutate('course',items.course.id,'archive'),/permission denied/);await assert.rejects(()=>db.query('update products set archived_at=null'),/permission denied/)}finally{await db.exec('reset role')}}
 })
 // Projection fixture uses minimal contract columns; it is not a full migration-chain/RLS rehearsal.
 await db.exec(`create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('fixture.actor',true),'')::uuid$$;
 create table subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid,order_id uuid,status text,starts_at timestamptz,ends_at timestamptz,archived_at timestamptz,created_at timestamptz default now(),plan_snapshot jsonb,admin_notes text);
 create table subscription_credit_ledger(id uuid default gen_random_uuid(),subscription_id uuid,delta integer);
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 await db.exec(read('094_customer_account_read_model_local_only.sql'))
 const first='30000000-0000-4000-8000-000000000001',other='30000000-0000-4000-8000-000000000002'
 await db.query("insert into subscriptions(id,user_id,status,starts_at,ends_at,plan_snapshot,admin_notes)values($1,$2,'active',now(),now()+interval '90 days',$3,'PRIVATE_NOTES'),($4,$5,'active',now(),now()+interval '90 days',$3,'OTHER_PRIVATE')",[first,actor,{title:'عقد محفوظ',sessions_included:8,eligible_service_ids:[items.service.id]},other,editor])
 await db.query('insert into subscription_credit_ledger(subscription_id,delta)values($1,8),($1,-2),($2,99)',[first,other])
 const setUser=id=>db.query("select set_config('fixture.actor',$1,false)",[id??''])
 await check('subscription projection isolates users and returns exact ledger sums without notes',async()=>{
   await setUser(actor);await db.exec('set role authenticated');const result=await one('select my_subscription_account(1) r');await db.exec('reset role')
   assert.equal(result.r.total,1);assert.equal(result.r.items[0].balance,6);assert.equal(result.r.items[0].title,'عقد محفوظ');assert.equal(result.r.items[0].eligibleServices[0].id,items.service.id);assert(!JSON.stringify(result).includes('PRIVATE'))
   await setUser(editor);const second=await one('select my_subscription_account(1) r');assert.equal(second.r.items[0].id,other);assert.equal(second.r.items[0].balance,99)
 })
 await check('subscription pagination remains exact beyond API row caps',async()=>{
   await db.query("insert into subscriptions(user_id,status,starts_at,ends_at,plan_snapshot)select $1,'active',now(),now()+interval '1 day','{}'::jsonb from generate_series(1,24)",[actor]);await setUser(actor)
   const firstPage=(await one('select my_subscription_account(1) r')).r,secondPage=(await one('select my_subscription_account(2) r')).r
   assert.equal(firstPage.total,25);assert.equal(firstPage.items.length,20);assert.equal(secondPage.items.length,5);assert.equal(new Set([...firstPage.items,...secondPage.items].map(row=>row.id)).size,25)
   await db.query('insert into subscription_credit_ledger(subscription_id,delta)select $1,1 from generate_series(1,1500)',[first]);assert.equal((await q('select sum(delta) n from subscription_credit_ledger where subscription_id=$1',[first]))[0].n,1506)
   const all=[...(await one('select my_subscription_account(1) r')).r.items,...(await one('select my_subscription_account(2) r')).r.items];assert.equal(all.find(row=>row.id===first).balance,1506)
 })
 await check('anonymous, missing identity and invalid pages are denied',async()=>{
   await db.exec('set role anon');try{await assert.rejects(()=>db.query('select my_subscription_account(1)'),/permission denied/)}finally{await db.exec('reset role')}
   await setUser(null);await assert.rejects(()=>db.query('select my_subscription_account(1)'),/Authentication required/);await setUser(actor)
   for(const page of [0,-1,100001,null])await assert.rejects(()=>db.query('select my_subscription_account($1)',[page]),/Invalid page/)
 })
 console.log(JSON.stringify({passed:count,scope:'Actual 094/095 SQL in one-connection synthetic PGlite fixtures; not Supabase/provider/concurrency acceptance'}))
}finally{await db.close()}
