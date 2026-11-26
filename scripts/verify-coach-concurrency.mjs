// Destructive fixtures are allowed ONLY in an isolated loopback restore/test DB.
// Two independent psql processes exercise real PostgreSQL locking and GiST.
import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
const binary=process.env.HEBA_TEST_PSQL||'psql'
const database=process.env.PGDATABASE||''
if(!['127.0.0.1','localhost'].includes(process.env.PGHOST)||!/^heba_(restore|test)_/.test(database))throw Error('Isolated loopback PGHOST and heba_restore_/heba_test_ database required')
function start(sql,onOutput=()=>{}){
 const child=spawn(binary,['-X','-q','-At','-v','ON_ERROR_STOP=1'],{env:process.env,stdio:['pipe','pipe','pipe']})
 let stdout='',stderr=''
 const completed=new Promise((resolve,reject)=>{child.on('error',reject);child.stdout.on('data',d=>{stdout+=d;onOutput(String(d))});child.stderr.on('data',d=>stderr+=d);child.on('close',code=>resolve({code,stdout,stderr}))})
 child.stdin.end(sql);return completed
}
async function run(sql){const r=await start(sql);if(r.code!==0)throw Error(`Local SQL failed (${r.code}); ${r.stderr.match(/ERROR:\s*([^\r\n]+)/)?.[1]||'see local database log'}`);return r.stdout.trim()}
const [u,v,p,q,s,t]=Array.from({length:6},randomUUID)
const jwt=id=>`select set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated","aal":"aal1"}',false);`
let readyResolve
const ready=new Promise(r=>readyResolve=r)
const day=await run("select ((now() at time zone 'Africa/Cairo')::date+7+((7-extract(dow from (now() at time zone 'Africa/Cairo')::date+7)::int)%7))::text;")
try{
 await run(`begin;
 insert into auth.users(id,email,raw_user_meta_data) values('${u}','${u}@example.test','{}'),('${v}','${v}@example.test','{}');
 insert into public.products(id,type,slug,title,price,is_published) values('${p}','session','qa-${p}','isolated concurrency',0,true),('${q}','session','qa-${q}','isolated concurrency',0,true);
 insert into public.services(id,product_id,slug,title,duration_minutes,price,is_active,booking_payment_mode,minimum_notice_minutes,booking_window_days,buffer_before_minutes,buffer_after_minutes)
 values('${s}','${p}','qa-${s}','isolated',30,0,true,'free',0,30,15,15),('${t}','${q}','qa-${t}','isolated',60,0,true,'free',0,30,0,0);
 insert into public.availability_rules(service_id,weekday,start_time,end_time) values('${s}',0,'10:00','20:00'),('${t}',0,'10:00','20:00');commit;`)
 const first=start(`begin;${jwt(u)}select public.create_booking_hold('${s}','${day}','12:00');\n\\echo RESERVATION_HELD\nselect pg_sleep(2);commit;`,chunk=>{if(chunk.includes('RESERVATION_HELD'))readyResolve()})
 await Promise.race([ready,first.then(()=>{throw Error('First reservation did not acquire lock')})])
 const second=start(`begin;set local lock_timeout='8s';${jwt(v)}select public.create_booking_hold('${t}','${day}','12:00');commit;`)
 const [a,b]=await Promise.all([first,second])
 assert.equal(a.code,0);assert.notEqual(b.code,0);assert.match(b.stderr,/SLOT_UNAVAILABLE|slot_unavailable/i)
 assert.equal(await run(`select count(*) from public.booking_holds where user_id in ('${u}','${v}') and status='active';`),'1')
 console.log('PASS concurrent cross-service holds: one winner, one denied, one active hold')
 await run(`update public.booking_holds set expires_at=now()-interval '1 second' where user_id='${u}';${jwt(v)}select public.create_booking_hold('${t}','${day}','12:00');`)
 assert.equal(await run(`select count(*) from public.coach_calendar_reservations where user_id in ('${u}','${v}') and (expires_at is null or expires_at>now());`),'1')
 console.log('PASS expired hold releases occupied buffer range to a different service')
 const denied=await start(`set request.jwt.claims='{"role":"service_role"}';select public.admin_save_coach_exception((select user_id from public.admin_roles where role='owner' limit 1),'${day}','closed','12:00','13:00','isolated');`)
 assert.notEqual(denied.code,0);assert.match(denied.stderr,/COACH_SCHEDULE_CONFLICT/)
 console.log('PASS closure preserves active hold and reports conflict')
}finally{
 await run(`begin;update public.audit_logs set actor_id=null where actor_id in ('${u}','${v}');delete from public.booking_holds where user_id in ('${u}','${v}');delete from public.services where id in ('${s}','${t}');delete from public.products where id in ('${p}','${q}');delete from auth.users where id in ('${u}','${v}');commit;`)
}
console.log('PASS all concurrency fixtures removed; production was never contacted')
