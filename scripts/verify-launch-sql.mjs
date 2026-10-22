import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {randomUUID} from 'node:crypto'
const modulePath=process.env.HEBA_TEST_PGLITE_PATH
if(!modulePath) throw Error('Set HEBA_TEST_PGLITE_PATH to the isolated PGlite index.js')
const {PGlite}=await import(pathToFileURL(modulePath).href)
const {btree_gist}=await import(pathToFileURL(modulePath.replace(/index\.js$/,'contrib/btree_gist.js')).href)
const db=new PGlite({extensions:{btree_gist}})
const read=p=>readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.startsWith(p))}`,'utf8')
let count=0;const check=async(name,run)=>{await run();count++;console.log('PASS '+name)}
const one=async(s,a=[])=>(await db.query(s,a)).rows[0]
const owner=randomUUID(),staff=randomUUID(),customer=randomUUID(),s1=randomUUID(),s2=randomUUID(),sid=randomUUID()
try{
 await db.exec(`create extension btree_gist;create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_setting('test.role',true)$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
 create table admin_roles(user_id uuid,role text);alter table admin_roles enable row level security;
 create table admin_permissions(role text,permission text);
 create table admin_sessions(id uuid default gen_random_uuid(),user_id uuid,revoked_at timestamptz,idle_expires_at timestamptz,absolute_expires_at timestamptz);
 create table audit_logs(actor_id uuid,action text,entity_type text,entity_id text,meta jsonb);
 create table products(id uuid primary key,is_published boolean);
 create table services(id uuid primary key,product_id uuid,title text,duration_minutes int,is_active boolean,buffer_before_minutes int default 0,buffer_after_minutes int default 0);
 create table bookings(id uuid primary key default gen_random_uuid(),user_id uuid,service_id uuid,starts_at timestamptz,ends_at timestamptz,status text,meeting_url text, constraint bookings_no_time_overlap exclude using gist(service_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in('pending','confirmed')));
 create table booking_holds(id uuid primary key default gen_random_uuid(),user_id uuid,service_id uuid,starts_at timestamptz,ends_at timestamptz,status text,expires_at timestamptz);
 create table availability_exceptions(service_id uuid,date date,kind text,start_time time,end_time time);
 create table availability_rules(service_id uuid,weekday int,start_time time,end_time time);
 create table booking_slot_overrides(service_id uuid,date date,start_time time,mode text);
 create function booking_service_policy(uuid) returns jsonb language sql stable set search_path=public as $$select jsonb_build_object('buffer_before_minutes',buffer_before_minutes,'buffer_after_minutes',buffer_after_minutes,'slot_interval_minutes',30,'minimum_notice_minutes',0,'booking_window_days',60) from services where id=$1$$;
 create function booking_runtime_contract() returns jsonb language sql stable as $$select '{"migration":"044","customerJourney":"093"}'::jsonb$$;
 `)
 await db.query('insert into auth.users values($1,$2),($3,$4),($5,$6)',[owner,'owner@example.test',staff,'staff@example.test',customer,'customer@example.test'])
 await db.query("insert into admin_roles values($1,'owner'),($2,'content')",[owner,staff])
 await db.exec(read('096').split('-- Readiness reflects')[0]);await db.exec(read('097'));await db.exec(read('098'))
 await db.query('insert into products values($1,true),($2,true)',[s1,s2])
 await db.query("insert into services(id,product_id,title,duration_minutes,is_active,buffer_after_minutes) values($1,$1,'A',60,true,10),($2,$2,'B',90,true,0)",[s1,s2])
 await db.query("insert into availability_rules select $1,d,'00:00','23:59' from generate_series(0,6) d",[s1]);await db.query("insert into availability_rules select $1,d,'00:00','23:59' from generate_series(0,6) d",[s2])
 const future=new Date(Date.now()+5*86400000);future.setUTCHours(9,0,0,0)
 const at=m=>new Date(future.getTime()+m*60000).toISOString()
 const book=(service,start=0,end=60)=>one("insert into bookings(user_id,service_id,starts_at,ends_at,status) values($1,$2,$3,$4,'confirmed') returning id",[customer,service,at(start),at(end)])
 const hold=(service,start=0,end=60,expiry=new Date(Date.now()+600000).toISOString())=>one("insert into booking_holds(user_id,service_id,starts_at,ends_at,status,expires_at) values($1,$2,$3,$4,'active',$5) returning id",[customer,service,at(start),at(end),expiry])
 const reset=()=>db.exec('delete from booking_email_outbox;delete from bookings;delete from booking_holds;')
 await check('calendar terminates, bounds its range and never wraps past midnight',async()=>{
  assert.equal((await one("select (time '23:30'+interval '30 minutes')::text t")).t,'00:00:00')
  const date=at(0).slice(0,10)
  const slots=(await db.query('select * from available_booking_slots($1,$2)',[s1,date])).rows
  assert(slots.length>0 && slots.length<=48)
  assert.equal((await one("select booking_slot_is_available($1,$2,'23:30') v",[s1,date])).v,false)
  await assert.rejects(()=>db.query("select * from available_booking_calendar($1,current_date,current_date+100)",[s1]),/INVALID_CALENDAR_RANGE/)
 })
 await check('different services cannot overlap bookings',async()=>{await book(s1);await assert.rejects(()=>book(s2,30,120),/conflicting|SLOT_UNAVAILABLE/);await reset()})
 await check('different services cannot overlap holds or steal another customer hold',async()=>{await hold(s1);await assert.rejects(()=>hold(s2,30,120),/SLOT_UNAVAILABLE/);await assert.rejects(()=>book(s2,30,120),/SLOT_UNAVAILABLE/);await reset()})
 await check('buffer is enforced across services and boundaries are half-open',async()=>{await book(s1);await assert.rejects(()=>book(s2,60,150),/SLOT_UNAVAILABLE/);await book(s2,70,160);await reset()})
 await check('hold conversion preserves a single shared reservation',async()=>{const h=await hold(s1);await book(s1);await db.query("update booking_holds set status='converted' where id=$1",[h.id]);assert.equal(Number((await one('select count(*) n from coach_calendar_reservations')).n),1);await reset()})
 await check('expired hold frees slot; cancellation and reschedule update ledger',async()=>{await hold(s1,0,60,new Date(Date.now()-1000).toISOString());const b=await book(s2);await db.query("update bookings set status='cancelled' where id=$1",[b.id]);const other=await book(s1);await db.query('update bookings set starts_at=$2,ends_at=$3 where id=$1',[other.id,at(180),at(240)]);await book(s2);await reset()})
 const setAuth=async(uid,role,claims={})=>{await db.query("select set_config('test.uid',$1,false),set_config('test.role',$2,false),set_config('test.jwt',$3,false)",[uid??'',role,JSON.stringify(claims)])}
 const allowed=async uid=>(await one("select has_permission('payments.approve',$1) v",[uid])).v
 await check('account throttle counts before auth and rejects excess attempts',async()=>{
  await setAuth(owner,'service_role');for(let i=0;i<20;i++)assert.equal((await one('select consume_admin_account_attempt($1) v',['a'.repeat(64)])).v,true)
  assert.equal((await one('select consume_admin_account_attempt($1) v',['a'.repeat(64)])).v,false)
  await db.exec("update admin_account_attempts set window_start=now()-interval '16 minutes'")
  assert.equal((await one('select consume_admin_account_attempt($1) v',['a'.repeat(64)])).v,true)
  await setAuth(owner,'authenticated');assert.equal((await one('select consume_admin_account_attempt($1) v',['a'.repeat(64)])).v,false)
 })
 await check('password owner requires enrollment, password AMR and active bound session',async()=>{
  await setAuth(owner,'authenticated',{aal:'aal1',session_id:sid,amr:[{method:'password'}]});assert.equal(await allowed(owner),false)
  await db.query('insert into owner_password_access(user_id) values($1)',[owner]);assert.equal(await allowed(owner),false)
  await db.query("insert into admin_sessions(user_id,auth_session_id,password_verified_at,idle_expires_at,absolute_expires_at) values($1,$2,now(),now()+interval '30 minutes',now()+interval '8 hours')",[owner,sid]);assert.equal(await allowed(owner),true)
  await setAuth(owner,'authenticated',{aal:'aal1',session_id:randomUUID(),amr:[{method:'password'}]});assert.equal(await allowed(owner),false)
  await setAuth(owner,'authenticated',{aal:'aal1',session_id:sid,amr:[{method:'recovery'}]});assert.equal(await allowed(owner),false)
 })
 await check('customer and staff AAL1 cannot impersonate the enrolled owner',async()=>{await setAuth(customer,'authenticated',{aal:'aal1',session_id:sid,amr:[{method:'password'}]});assert.equal(await allowed(owner),false);assert.equal(await allowed(customer),false);await setAuth(staff,'authenticated',{aal:'aal1'});assert.equal(await allowed(staff),false)})
 await check('revocation and idle expiry deny owner password access',async()=>{await setAuth(owner,'authenticated',{aal:'aal1',session_id:sid,amr:[{method:'password'}]});await db.query('update admin_sessions set revoked_at=now()');assert.equal(await allowed(owner),false);await db.query("update admin_sessions set revoked_at=null,idle_expires_at=now()-interval '1 minute'");assert.equal(await allowed(owner),false)})
 await check('email snapshots collapse superseded pending states and lease idempotently',async()=>{
  const b=await book(s1);await db.query("update bookings set status='cancelled' where id=$1",[b.id]);await setAuth(owner,'service_role');const r=(await one('select claim_booking_emails(5) v')).v;assert.equal(r.length,1);assert(r[0].subject.includes('إلغاء'));assert.equal((await one('select claim_booking_emails(5) v')).v.length,0)
  assert.equal((await one('select finalize_booking_email($1,$2,true) v',[r[0].id,randomUUID()])).v,false);assert.equal((await one('select finalize_booking_email($1,$2,true) v',[r[0].id,r[0].leaseId])).v,true);assert.equal((await one('select claim_booking_emails(5) v')).v.length,0)
 })
 await check('browser roles cannot call mail or mutate private owner/calendar tables',async()=>{for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);try{await assert.rejects(()=>db.query('select claim_booking_emails(5)'),/permission denied/);await assert.rejects(()=>db.query('delete from owner_password_access'),/permission denied/);await assert.rejects(()=>db.query('delete from coach_calendar_reservations'),/permission denied/)}finally{await db.exec('reset role')}}})
 await db.exec(`create table courses(id uuid primary key,is_published boolean);create table course_modules(id uuid primary key,course_id uuid);create table course_lessons(id uuid primary key,module_id uuid,video_path text,duration_seconds int);`)
 await db.exec(read('099'))
 const course=randomUUID(),moduleId=randomUUID(),lesson=randomUUID(),intent=randomUUID()
 await db.query('insert into courses values($1,true)',[course]);await db.query('insert into course_modules values($1,$2)',[moduleId,course]);await db.query('insert into course_lessons values($1,$2,null,0)',[lesson,moduleId])
 const stream=(id,action,payload={},who=owner)=>one('select manage_lesson_stream_upload($1,$2,$3,$4,$5) v',[who,lesson,id,action,payload])
 const payload={bytes:50000000,fingerprint:'a'.repeat(64),maxSeconds:7200}
 await check('Stream lease is scoped, resumable and permission-rechecked',async()=>{
  assert.equal((await stream(intent,'begin',payload)).v.fresh,true)
  assert.equal((await stream(intent,'begin',payload)).v.fresh,false)
  await assert.rejects(()=>stream(randomUUID(),'begin',payload),/in_progress/)
  await assert.rejects(()=>stream(intent,'begin',payload,customer),/permission_required/)
  await assert.rejects(()=>stream(intent,'begin',{...payload,bytes:50}),/file_mismatch/)
  await assert.rejects(()=>stream(intent,'provision',{uid:'a'.repeat(32),url:'https://attacker.invalid/x'}),/provision_invalid/)
  await stream(intent,'provision',{uid:'a'.repeat(32),url:'https://upload.videodelivery.net/'+ 'a'.repeat(32)})
  assert.equal((await stream(intent,'begin',payload)).v.status,'uploading')
 })
 await check('Stream binds atomically, preserves concurrent edits and idempotently recovers',async()=>{
  await db.query("update course_lessons set video_path='new/file.mp4' where id=$1",[lesson]);await assert.rejects(()=>stream(intent,'bind',{duration:3600}),/lesson_changed/)
  await db.query('update course_lessons set video_path=null where id=$1',[lesson]);await stream(intent,'bind',{duration:3600})
  assert.equal((await one('select video_path from course_lessons where id=$1',[lesson])).video_path,'stream/'+ 'a'.repeat(32))
  assert.equal((await stream(intent,'bind',{duration:3600})).v.status,'bound')
  assert.equal((await one('select upload_url from lesson_stream_uploads where id=$1',[intent])).upload_url,null)
 })
 await db.exec(`alter table course_lessons add is_preview boolean default false;
 create table course_enrollments(user_id uuid,course_id uuid);
 create table protected_delivery_events(user_id uuid,event_kind text,entity_id uuid,outcome text,detail jsonb);
 create table delivery_devices(id uuid primary key default gen_random_uuid(),user_id uuid,device_hash text,revoked_at timestamptz,last_seen_at timestamptz default now(),unique(user_id,device_hash));
 create table video_admission_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,lesson_id uuid,device_id uuid,token_hash text,expires_at timestamptz,revoked_at timestamptz,last_seen_at timestamptz default now());`)
 await db.exec(read('100'))
 await check('long lesson admission lasts four hours and rechecks enrollment and devices',async()=>{
  const token='b'.repeat(64),device='c'.repeat(64)
  assert.equal((await one('select * from begin_video_admission($1,$2,$3,$4)',[customer,lesson,device,token])).status,'access_denied')
  await db.query('insert into course_enrollments values($1,$2)',[customer,course])
  const admission=await one('select * from begin_video_admission($1,$2,$3,$4)',[customer,lesson,device,token])
  assert.equal(admission.status,'allowed');assert(Date.parse(admission.expires_at)>Date.now()+3.9*3600000)
  const validate=async()=> (await one('select validate_video_admission($1,$2,$3) v',[customer,lesson,token])).v
  assert.equal(await validate(),true)
  await db.exec('update delivery_devices set revoked_at=now()');assert.equal(await validate(),false)
  await db.exec('update delivery_devices set revoked_at=null');assert.equal(await validate(),true)
  await db.exec('delete from course_enrollments');assert.equal(await validate(),false)
 })
 await db.exec(`create table pages(id uuid primary key default gen_random_uuid(),slug text unique,title text,is_published boolean,status text);
 create table page_sections(id uuid primary key default gen_random_uuid(),page_id uuid,name text,kind text,sort int,is_visible boolean,content jsonb);
 create table content_revisions(entity_type text,entity_id uuid,snapshot jsonb,created_by uuid);`)
 await db.exec(read('101'))
 const sections=['hero','trust','pathways','editorial_feature','articles','cta'].map((kind,i)=>({kind,name:kind,sort:i*10,content:{}}))
 await check('home template preserves existing sections and makes a revision',async()=>{
  await one('select apply_learning_home_layout($1,$2)',[owner,sections]);assert.equal(Number((await one('select count(*) n from page_sections where is_visible')).n),6)
  await one('select apply_learning_home_layout($1,$2)',[owner,sections]);assert.equal(Number((await one('select count(*) n from page_sections')).n),12);assert.equal(Number((await one('select count(*) n from content_revisions')).n),6)
  await assert.rejects(()=>one('select apply_learning_home_layout($1,$2)',[customer,sections]),/permission required/)
 })
 console.log(JSON.stringify({passed:count,scope:'Actual 096-101 SQL with synthetic PGlite fixtures; not live Supabase, multi-connection or provider acceptance'}))
}finally{await db.close()}
