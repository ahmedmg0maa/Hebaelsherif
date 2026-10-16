import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { catalogFixtureSQL, actor, editor, catalogPayload } from './catalog-test-fixture.mjs'
import { payload } from './verify-commerce-administration-local.mjs'
if (!process.env.HEBA_TEST_PGLITE_PATH) throw new Error('Set HEBA_TEST_PGLITE_PATH to separately installed PGlite 0.5.8. No remote database is used.')
const { PGlite }=await import(pathToFileURL(process.env.HEBA_TEST_PGLITE_PATH).href)
const db=new PGlite(); let checks=0
const read=n=>readFileSync(`supabase/migrations/${n}`,'utf8')
const table=(file,name)=>{const m=read(file).match(new RegExp(`create table (?:if not exists )?public\\.${name} \\([\\s\\S]*?\\n\\);`,'i'));assert.ok(m,name);return m[0]}
const alter=(file,name)=>read(file).match(new RegExp(`alter table public\\.${name}\\s+[\\s\\S]*?;`,'i'))[0]
const check=async(name,fn)=>{await fn();checks++;console.log(`PASS ${name}`)}
const mutate=async(kind,id,action,content={},parent=null,who=actor)=>(await db.query('select manage_commerce_record($1,$2,$3,$4,$5::jsonb,$6) result',[who,kind,id,action,JSON.stringify(content),parent])).rows[0].result
const state=async()=>{const all={};for(const t of ['products','product_variants','subscription_plans','subscription_plan_services','subscriptions','coupons','offers','offer_targets','media_usages','content_revisions','audit_logs','feature_flags']) all[t]=(await db.query(`select to_jsonb(t) row from ${t} t order by to_jsonb(t)::text`)).rows;return all}
const unchanged=async(fn,pattern)=>{const before=await state();await assert.rejects(fn,pattern);assert.deepEqual(await state(),before)}
try {
 await db.exec(catalogFixtureSQL()+`
  create function auth.uid() returns uuid language sql stable as $$ select '${actor}'::uuid $$;
  insert into fixture_permissions values ('${actor}','packages.manage'),('${actor}','marketing.manage'),('${actor}','feature_flags.manage'),('${actor}','admin.access');
  ${table('003_commerce.sql','product_variants')}
  ${table('003_commerce.sql','coupons')}
  ${table('003_commerce.sql','offers')}
  ${table('003_commerce.sql','offer_targets')}
  ${table('003_commerce.sql','orders')}
  ${table('003_commerce.sql','coupon_redemptions')}
  alter table order_items add column order_id uuid references orders(id);
  alter table order_items add column variant_id uuid references product_variants(id);
  ${table('018_admin_control_center.sql','subscription_plans')}
  ${table('018_admin_control_center.sql','subscriptions')}
  ${table('029_booking_credit_integrity.sql','subscription_plan_services')}
  ${alter('029_booking_credit_integrity.sql','subscription_plans')}
  ${alter('029_booking_credit_integrity.sql','subscriptions')}
  alter table subscription_plans add column product_id uuid unique references products(id) on delete restrict;
  create table resources(id uuid default gen_random_uuid(),related_product_id uuid references products(id));
  create table subscription_credit_ledger(id uuid default gen_random_uuid());
  create table profiles(id uuid primary key);
  alter table services add column category text;
  create table availability_exceptions(id uuid default gen_random_uuid());
  ${table('008_cms.sql','feature_flags')}
  ${table('008_cms.sql','contact_messages')}
  ${table('008_cms.sql','newsletter_subscribers')}
  ${alter('055_newsletter_consent_governance_local_only.sql','newsletter_subscribers')}
  create table booking_holds(id uuid default gen_random_uuid());
  grant select,insert,update,delete on product_variants,subscription_plans,subscription_plan_services,coupons,offers,offer_targets to anon,authenticated;
 `)
 await db.exec(read('086_atomic_catalog_editor_local_only.sql'))
 await db.exec(read('087_atomic_commerce_administration_local_only.sql'))
 const service=(await db.query('select manage_catalog_item($1,$2,null,$3,$4::jsonb) result',[actor,'service','save',JSON.stringify(catalogPayload('service'))])).rows[0].result
 const program=await mutate('program',null,'save',payload('program'))
 const plan=await mutate('plan',null,'save',payload('plan',{product_id:program.id,eligible_service_ids:[service.id]}))
 const sub=(await db.query("insert into subscriptions(user_id,plan_id,ends_at,plan_snapshot) values($1,$2,now()+interval '30 days',$3::jsonb) returning id",[actor,plan.id,JSON.stringify({title:'Original',sessions_included:5})])).rows[0].id
 await db.exec(read('088_subscription_contract_preservation_local_only.sql'))
 await db.exec(read('089_site_operation_controls_local_only.sql'))
 const flagSql=read('079_atomic_advanced_settings_and_flags_local_only.sql');const start=flagSql.indexOf('create or replace function public.manage_feature_flag(');await db.exec(flagSql.slice(start,flagSql.indexOf('-- Rollback-by-forward-fix',start)))
 await check('subscription backfill keeps original contract and adds eligibility',async()=>{const r=(await db.query('select plan_snapshot from subscriptions where id=$1',[sub])).rows[0].plan_snapshot;assert.deepEqual(r,{title:'Original',sessions_included:5,eligible_service_ids:[service.id]})})
 const records={program,plan}
 for(const kind of ['variant','coupon','offer']) await check(`${kind} saves with audit`,async()=>{records[kind]=await mutate(kind,null,'save',payload(kind),kind==='variant'?program.id:null);assert.ok(records[kind].id)})
 await check('strict SQL validation rejects bypassed form payloads',async()=>{for(const [kind,changes] of [['program',{type:'book'}],['variant',{price:1.123}],['plan',{duration_days:0}],['coupon',{value:101}],['offer',{discount_kind:'unknown'}],['plan',{unknown:true}]]) await unchanged(()=>mutate(kind,records[kind].id,'save',{...payload(kind),...changes},kind==='variant'?program.id:null),/commerce_payload_invalid/)})
 await check('unauthorized marketing and package mutation denied',async()=>{for(const kind of ['coupon','offer','plan']) await unchanged(()=>mutate(kind,records[kind].id,'save',payload(kind),null,editor),/commerce_permission_required/)})
 await check('cross-product variant and specialized delete bypass denied',async()=>{await unchanged(()=>mutate('variant',records.variant.id,'save',payload('variant'),service.productId),/commerce_parent_invalid/);await unchanged(()=>mutate('program',service.productId,'delete'),/commerce_specialized_editor_required/)})
 await check('published programme and variant require publish permission',async()=>{await db.query('update products set is_published=true where id=$1',[program.id]);await unchanged(()=>mutate('program',program.id,'save',payload('program'),null,editor),/commerce_publish_required/);await unchanged(()=>mutate('variant',records.variant.id,'save',payload('variant'),program.id,editor),/commerce_publish_required/);await unchanged(()=>mutate('plan',plan.id,'archive'),/commerce_published_product_requires_withdrawal/);await db.query('update products set is_published=false where id=$1',[program.id])})
 await check('plan change preserves subscription service and credit snapshots',async()=>{await mutate('plan',plan.id,'save',payload('plan',{sessions_included:'1'}));const snapshot=(await db.query('select plan_snapshot from subscriptions where id=$1',[sub])).rows[0].plan_snapshot;assert.equal(snapshot.sessions_included,5);assert.deepEqual(snapshot.eligible_service_ids,[service.id]);await assert.rejects(()=>db.query("update subscriptions set plan_snapshot='{}' where id=$1",[sub]),/subscription_contract_immutable/)})
 await check('future subscription captures new plan service eligibility',async()=>{const r=await db.query("insert into subscriptions(user_id,plan_id,ends_at,plan_snapshot) values($1,$2,now()+interval '30 days','{\"sessions_included\":1}') returning plan_snapshot",[actor,plan.id]);assert.deepEqual(r.rows[0].plan_snapshot.eligible_service_ids,[])})
 await check('exact active count covers every subscription',async()=>{const r=await db.query('select admin_plan_active_counts($1,$2) counts',[actor,[plan.id]]);assert.equal(r.rows[0].counts[plan.id],2);await unchanged(()=>mutate('plan',plan.id,'save',payload('plan',{max_subscribers:'1'})),/commerce_capacity_invalid/)})
 await check('archive and explicit restore retain history and stay closed',async()=>{await mutate('plan',plan.id,'archive');await unchanged(()=>mutate('plan',plan.id,'save',payload('plan')),/commerce_plan_archived/);await mutate('plan',plan.id,'restore');const r=(await db.query('select archived_at,is_active,is_published from subscription_plans where id=$1',[plan.id])).rows[0];assert.deepEqual(r,{archived_at:null,is_active:false,is_published:false});await unchanged(()=>mutate('plan',plan.id,'delete'),/commerce_history_exists/)})
 await check('offers preserve multiple mixed targets atomically',async()=>{const targets=[{product_id:program.id,product_type:'bundle',category:null},{product_id:null,product_type:'course',category:'growth'}];await mutate('offer',records.offer.id,'save',payload('offer',{targets:JSON.stringify(targets)}));assert.equal((await db.query('select count(*)::int n from offer_targets')).rows[0].n,2)})
 await check('used coupons offers variants and programmes cannot delete',async()=>{await db.query('insert into orders(user_id,coupon_id,offer_id) values($1,$2,$3)',[actor,records.coupon.id,records.offer.id]);await db.query('insert into order_items(product_id,variant_id) values($1,$2)',[program.id,records.variant.id]);for(const kind of ['coupon','offer','program','variant']) await unchanged(()=>mutate(kind,records[kind].id,'delete',{},kind==='variant'?program.id:null),/commerce_history_exists/)})
 await check('new order and booking intake can close independently; existing updates remain',async()=>{await db.query("select manage_feature_flag($1,'checkout_open',false)",[actor]);await assert.rejects(()=>db.query('insert into orders(user_id) values($1)',[actor]),/site_intake_closed/);await db.exec('update orders set status=\'paid\'; insert into booking_holds default values');await db.query("select manage_feature_flag($1,'booking_open',false)",[actor]);await assert.rejects(()=>db.exec('insert into booking_holds default values'),/site_intake_closed/);await db.query("select manage_feature_flag($1,'checkout_open',true)",[actor]);await db.query('insert into orders(user_id) values($1)',[actor]);await db.query("select manage_feature_flag($1,'booking_open',true)",[actor])})
 await check('master closure blocks intake and reopening works',async()=>{await db.query("select manage_feature_flag($1,'site_open',false)",[actor]);await assert.rejects(()=>db.query('insert into orders(user_id) values($1)',[actor]),/site_intake_closed/);await assert.rejects(()=>db.exec('insert into booking_holds default values'),/site_intake_closed/);await db.query("select manage_feature_flag($1,'site_open',true)",[actor]);await db.exec('insert into booking_holds default values')})
 await check('newsletter closure preserves unsubscribe updates',async()=>{await db.exec("insert into newsletter_subscribers(email) values('synthetic@example.test')");await db.query("select manage_feature_flag($1,'newsletter_open',false)",[actor]);await assert.rejects(()=>db.exec("insert into newsletter_subscribers(email) values('new@example.test')"),/site_intake_closed/);await db.exec("update newsletter_subscribers set status='unsubscribed',unsubscribed_at=now()");await assert.rejects(()=>db.exec("update newsletter_subscribers set status='subscribed',consent_at=now()"),/site_intake_closed/);})
 await check('offer capacity excludes exhausted quotes and reservation guard is enforced',async()=>{
   await db.exec("create function checkout_product_ready(uuid) returns boolean language sql as $$ select exists(select 1 from public.products where id=$1 and is_published) $$;alter table coupons add column allow_with_offers boolean default false;create table coupon_targets(coupon_id uuid,product_id uuid,product_type text);")
   await db.query('update products set is_published=true where id=$1',[program.id]);await db.query('update offers set usage_limit=1 where id=$1',[records.offer.id]);
   assert.equal((await db.query('select offer_has_capacity($1) ok',[records.offer.id])).rows[0].ok,false)
   const quote=()=>db.query("select calculate_checkout_quote($1,$2,null,'') q",[actor,program.id]);assert.equal((await quote()).rows[0].q.offerId,null)
   await assert.rejects(()=>db.query('insert into orders(user_id,offer_id) values($1,$2)',[actor,records.offer.id]),/offer_capacity_exhausted/)
   await db.query("update orders set status='cancelled' where offer_id=$1",[records.offer.id]);assert.equal((await quote()).rows[0].q.offerId,records.offer.id)
   await db.query('update products set is_published=false where id=$1',[program.id])
 })
 await check('subscription service history prevents delete after plan scope changed',()=>assert.rejects(()=>db.query('delete from services where id=$1',[service.id]),/subscription_service_history_exists/))
 await check('targeted offer product deletion cannot broaden scope',async()=>{
   const r=await mutate('program',null,'save',payload('program',{slug:'targeted-unused'}));const o=await mutate('offer',null,'save',payload('offer',{targets:JSON.stringify([{product_id:r.id}])}));
   await unchanged(()=>mutate('program',r.id,'delete'),/offer_targets_product_id_fkey/);await mutate('offer',o.id,'delete');await mutate('program',r.id,'delete')
 })
 await check('pending linked plan orders prevent changing purchase terms',async()=>{
   const pr=await mutate('program',null,'save',payload('program',{slug:'pending-plan-product'}));const pl=await mutate('plan',null,'save',payload('plan',{slug:'pending-plan',product_id:pr.id}));
   const order=(await db.query('insert into orders(user_id) values($1) returning id',[actor])).rows[0].id;await db.query('insert into order_items(order_id,product_id) values($1,$2)',[order,pr.id]);
   await unchanged(()=>mutate('plan',pl.id,'save',payload('plan',{slug:'pending-plan',sessions_included:'2'})),/commerce_pending_plan_orders/);
   await unchanged(()=>mutate('plan',pl.id,'archive'),/commerce_pending_plan_orders/);await db.query("update orders set status='cancelled' where id=$1",[order]);await mutate('plan',pl.id,'archive')
 })
 await check('package booking uses frozen service eligibility before checkout',async()=>{
   await db.exec("begin;create or replace function public.create_booking_order(p_service_id uuid,p_date date,p_time time,p_full_name text,p_phone text,p_notes text default '') returns jsonb language plpgsql as $$ begin raise exception 'ELIGIBLE_REACHED_CHECKOUT_FIXTURE';end $$;")
   try {await assert.rejects(()=>db.query("select create_package_booking($1,current_date,'12:00','Synthetic','123456789','',$2)",[service.id,sub]),/ELIGIBLE_REACHED_CHECKOUT_FIXTURE/)} finally {await db.exec('rollback')}
   await assert.rejects(()=>db.query("select create_package_booking($1,current_date,'12:00','Synthetic','123456789','',$2)",['90000000-0000-4000-8000-000000000001',sub]),/SERVICE_NOT_ELIGIBLE_FOR_PACKAGE/)
 })
 const rollbackDelete=await mutate('program',null,'save',payload('program',{slug:'rollback-delete'}))
 // Inject failure at the final audit write: every preceding change must disappear.
 await db.exec("create function fixture_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'forced_audit_failure';end $$;create trigger force_audit before insert on audit_logs for each row execute function fixture_audit_failure();")
 await check('audit failure rolls back all five aggregate saves and new records',async()=>{for(const kind of ['program','variant','plan','coupon','offer']) {const value=payload(kind,kind==='plan'?{eligible_service_ids:[service.id]}:kind==='offer'?{targets:JSON.stringify([{product_type:'book'}])}:{});await unchanged(()=>mutate(kind,records[kind].id,'save',value,kind==='variant'?program.id:null),/forced_audit_failure/)}await unchanged(()=>mutate('program',null,'save',payload('program',{slug:'new-failed'})),/forced_audit_failure/)})
 await check('audit failure rolls back delete toggles archive and operational flags',async()=>{await unchanged(()=>mutate('program',rollbackDelete.id,'delete'),/forced_audit_failure/);await unchanged(()=>mutate('offer',records.offer.id,'active',{is_active:false}),/forced_audit_failure/);await unchanged(()=>mutate('plan',plan.id,'archive'),/forced_audit_failure/);await unchanged(()=>db.query("select manage_feature_flag($1,'site_open',false)",[actor]),/forced_audit_failure/)})
 await db.exec('drop trigger force_audit on audit_logs')
 await check('unused records can be permanently deleted',async()=>{for(const kind of ['program','variant','plan','coupon','offer']) {const r=await mutate(kind,null,'save',payload(kind,{slug:`unused-${kind}`,code:'UNUSED'}),kind==='variant'?program.id:null);await mutate(kind,r.id,'delete',{},kind==='variant'?program.id:null)}})
 await check('browser roles cannot execute commerce RPC or mutate governed tables',async()=>{for(const role of ['anon','authenticated']) {assert.equal((await db.query("select has_function_privilege($1,'public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid)','EXECUTE') ok",[role])).rows[0].ok,false);for(const t of ['product_variants','subscription_plans','subscription_plan_services','coupons','offers','offer_targets']) for(const privilege of ['INSERT','UPDATE','DELETE']) assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',[role,t,privilege])).rows[0].ok,false)}})
 await check('effective navigation permissions match real owner and delegated role grants',async()=>{
   await db.exec("create table admin_roles(user_id uuid,role text);create table admin_permissions(role text,permission text);")
   const source=read('019_granular_permissions.sql'), start=source.indexOf('create or replace function public.has_permission('), end=source.indexOf('$$;',source.indexOf('as $$',start)+5)+3
   // Existing fixture signature names differ; use the actual function body with fixture argument names.
   await db.exec(source.slice(start,end).replace('permission_name text, uid uuid default auth.uid()','p text, a uuid default auth.uid()').replace('r.user_id = uid','r.user_id = a').replace('p.permission = permission_name','p.permission = $1'))
   await db.query("insert into admin_roles values($1,'owner')",[actor]);const permissions=(await db.query('select get_effective_admin_permissions() p')).rows[0].p;assert.ok(permissions.includes('roles.manage'));assert.ok(permissions.includes('feature_flags.manage'));assert.equal(permissions.length,44)
   await db.query("update admin_roles set role='editor' where user_id=$1",[actor]);await db.exec("insert into admin_permissions values('editor','admin.access'),('editor','feature_flags.manage');")
   assert.deepEqual((await db.query('select get_effective_admin_permissions() p')).rows[0].p,['admin.access','feature_flags.manage']);await db.exec("delete from admin_permissions where permission='feature_flags.manage'");assert.deepEqual((await db.query('select get_effective_admin_permissions() p')).rows[0].p,['admin.access'])
 })
 console.log(`PASS ${checks} local SQL groups; real 087–089 statements, synthetic permission/history fixtures. Not full Supabase, concurrency or provider acceptance.`)
} finally { await db.close() }
