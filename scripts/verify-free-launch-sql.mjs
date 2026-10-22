import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
const path = process.env.HEBA_TEST_PGLITE_PATH
if (!path) throw Error('Set HEBA_TEST_PGLITE_PATH to a separately installed PGlite index.js.')
const { PGlite } = await import(pathToFileURL(path).href)
const db = new PGlite()
const owner=randomUUID(), customer=randomUUID(),service=randomUUID(), booking=randomUUID(), inbox=randomUUID()
let passed=0
const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0]
const check=async(name,run)=>{await run();passed++;console.log('PASS '+name)}
const read=name=>readFileSync('supabase/migrations/'+name,'utf8')
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.role() returns text language sql stable as $$select current_setting('test.role',true)$$;
 create table auth.users(id uuid primary key,email text);
 create table services(id uuid primary key,title text);
 create table bookings(id uuid primary key,user_id uuid,service_id uuid,status text,starts_at timestamptz,meeting_url text);
 create table site_settings(key text,value jsonb);
 create table audit_logs(actor_id uuid,action text,entity_type text,entity_id text,meta jsonb);
 create table email_outbox(id uuid primary key,to_email text,subject text,body_text text,attempts int default 0,status text default 'queued',locked_at timestamptz,next_attempt_at timestamptz,last_error text);
 create function has_permission(p_permission text,p_actor uuid) returns boolean language sql stable as $$select p_actor='${owner}'::uuid$$;
 select set_config('test.role','service_role',false);
 insert into site_settings values('email_delivery','{"enabled":true,"provider":"resend"}');`)
 const legacy=read('057_operational_settings_and_resend_outbox_local_only.sql')
 const start=legacy.indexOf('create or replace function public.claim_email_outbox('),end=legacy.indexOf('\nend $$;',start)+9
 await db.exec(legacy.slice(start,end))
 await db.exec(read('098_booking_status_email.sql'))
 await db.exec(read('102_free_launch_operations.sql'))
 await db.query('insert into auth.users values($1,$2)',[customer,'fixture@example.test'])
 await db.query('insert into services values($1,$2)',[service,'جلسة اختبار'])
 await db.query("insert into bookings values($1,$2,$3,'pending',now()+interval '1 day',null)",[booking,customer,service])
 await db.query('insert into email_outbox(id,to_email,subject,body_text) values($1,$2,$3,$4)',[inbox,'fixture@example.test','Reply','Fixture'])
 await check('revision exposes actual free operations contract',async()=>assert.equal((await one('select launch_runtime_contract() v')).v.freeOperations,'102'))
 await check('claim and budget reservation commit together; lease blocks duplicate claim',async()=>{
  const items=(await one('select claim_booking_emails(1) v')).v
  assert.equal(items.length,1);assert.equal(Number((await one('select count(*) n from application_email_budget')).n),1)
  assert.equal((await one('select claim_booking_emails(1) v')).v.length,0)
  await one('select finalize_booking_email($1,$2,false,$3)',[items[0].id,items[0].leaseId,'provider_rate_limited'])
  assert.equal((await one('select status from booking_email_outbox')).status,'failed')
 })
 await check('inbox shares booking budget and keeps permission checks',async()=>{
  await assert.rejects(()=>one('select claim_email_outbox($1,$2)',[inbox,customer]),/permission_required/)
  const claimed=(await one('select claim_email_outbox($1,$2) v',[inbox,owner])).v
  assert.equal(claimed.attempt,1);assert.equal(Number((await one('select count(*) n from application_email_budget')).n),2)
 })
 await check('daily cap defers booking without consuming attempt or marking sent',async()=>{
  await db.exec("delete from application_email_budget;insert into application_email_budget(attempt_key) select 'booking/'||(1000+x)||'/1' from generate_series(1,80) x;update booking_email_outbox set next_attempt_at=now(),lease_until=null")
  const before=(await one('select attempts from booking_email_outbox')).attempts
  assert.equal((await one('select claim_booking_emails(1) v')).v.length,0)
  assert.equal((await one('select attempts from booking_email_outbox')).attempts,before)
  assert.equal((await one('select status from booking_email_outbox')).status,'failed')
 })
 await check('daily cap rolls back inbox claim and its audit atomically',async()=>{
  await db.exec("update email_outbox set status='failed',locked_at=null,next_attempt_at=null")
  const before=(await one('select attempts from email_outbox')).attempts,audit=Number((await one('select count(*) n from audit_logs')).n)
  await assert.rejects(()=>one('select claim_email_outbox($1,$2)',[inbox,owner]),/email_free_budget_exceeded/)
  assert.equal((await one('select attempts from email_outbox')).attempts,before)
  assert.equal(Number((await one('select count(*) n from audit_logs')).n),audit)
 })
 await check('monthly cap refuses a fresh attempt and repeated reservation is idempotent',async()=>{
  await db.exec("delete from application_email_budget;insert into application_email_budget(attempt_key,reserved_at) select 'booking/'||(10000+x)||'/1',date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' from generate_series(1,2400) x")
  assert.equal((await one("select reserve_free_email_attempt('booking/99999/1') v")).v,false)
  assert.equal((await one("select reserve_free_email_attempt('booking/10001/1') v")).v,true)
  assert.equal(Number((await one('select count(*) n from application_email_budget')).n),2400)
 })
 await check('expired rolling window makes capacity available; failed retries count conservatively',async()=>{
  await db.exec("delete from application_email_budget;insert into application_email_budget values(default,'booking/999999/1',now()-interval '25 hours')")
  const items=(await one('select claim_booking_emails(1) v')).v;assert.equal(items.length,1)
  await one('select finalize_booking_email($1,$2,false,$3)',[items[0].id,items[0].leaseId,'provider_auth_failed'])
  assert.equal((await one("select next_attempt_at='infinity'::timestamptz terminal from booking_email_outbox")).terminal,true)
 })
 await check('summary denies wrong actor and exposes counters without recipient or body',async()=>{
  await assert.rejects(()=>one('select free_launch_mail_status($1)',[customer]),/permission required/)
  const status=(await one('select free_launch_mail_status($1) v',[owner])).v
  assert.equal(status.terminalFailures,1);assert.equal(status.dailyLimit,80)
  assert(!JSON.stringify(status).includes('fixture@example.test'));assert(!JSON.stringify(status).includes('جلسة اختبار'))
 })
 await check('invalid finalization is rejected and cannot forge sent state',async()=>{
  await assert.rejects(()=>one('select finalize_booking_email(1,$1,true,$2)',[randomUUID(),'provider_unavailable']),/invalid delivery outcome/)
  assert.equal((await one('select status from booking_email_outbox')).status,'failed')
 })
 await check('browser roles cannot read budgets, claim mail or invoke internal legacy claim',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role)
   try {
    await assert.rejects(()=>db.query('select * from application_email_budget'),/permission denied/)
    await assert.rejects(()=>db.query("select reserve_free_email_attempt('booking/888/1')"),/permission denied/)
    await assert.rejects(()=>db.query('select claim_email_outbox_pre_free($1,$2)',[inbox,owner]),/permission denied/)
    if(role!=='service_role')await assert.rejects(()=>db.query('select claim_booking_emails(1)'),/permission denied/)
   } finally {await db.exec('reset role')}
  }
 })
 console.log(JSON.stringify({passed,scope:'Actual 098/102 and legacy 057 claim on synthetic single-connection PGlite fixtures; not full history, live Supabase or provider concurrency.'}))
} finally { await db.close() }

