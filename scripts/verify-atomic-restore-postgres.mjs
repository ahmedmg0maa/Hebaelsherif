import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run,start}=isolatedPostgres(),[id,revision,deniedActor]=Array.from({length:3},randomUUID)
const role="set request.jwt.claims='{"+'"role":"service_role"'+"}';"
const actor=run("select user_id from public.admin_roles where role='owner' limit 1")
assert.match(actor,/^[0-9a-f-]{36}$/)
const call=version=>`select public.restore_content_revision_atomic('${actor}','${revision}',${version});`
const state=()=>JSON.parse(run(`select json_build_object('row',(select to_jsonb(p) from public.pages p where id='${id}'),'checkpoints',(select count(*) from public.content_revisions where entity_id='${id}'),'audits',(select count(*) from public.audit_logs where entity_id='${id}'));`))
const version=()=>state().row.row_version
try{
 run(`insert into public.pages(id,slug,title,status,is_published) values('${id}','qa-${id}','عنوان حالي محفوظ','draft',false);insert into public.content_revisions(id,entity_type,entity_id,snapshot,created_by) select '${revision}','page',id,to_jsonb(p)||'{"title":"عنوان سابق للاستعادة","status":"published","is_published":true}'::jsonb,'${actor}' from public.pages p where id='${id}';`)
 const context=JSON.parse(run(role+`select public.admin_content_restore_context('${actor}','${revision}');`));assert.equal(context.version,1)
 run(role+call(1));const saved=state();assert.equal(saved.row.title,'عنوان سابق للاستعادة');assert.equal(saved.row.status,'draft');assert.equal(saved.row.is_published,false);assert.equal(saved.row.row_version,2);assert.equal(saved.checkpoints,2);assert.equal(saved.audits,1)
 console.log('PASS committed restore survives a new database connection: content/draft/checkpoint/audit/version')
 const baseline=state();assert.throws(()=>run(role+call(1)),/content_version_conflict/);assert.deepEqual(state(),baseline)
 assert.throws(()=>run(role+`select public.restore_content_revision_atomic('${deniedActor}','${revision}',2)`),/content_publish_required/);assert.deepEqual(state(),baseline)
 console.log('PASS stale version and unauthorized actor leave every affected row unchanged')
 // Fault triggers exist only inside this test transaction and are rolled back.
 run(`begin;${role}
 create function public.fixture_restore_fault() returns trigger language plpgsql as $$begin if current_setting('heba_test.restore_fault',true)=TG_ARGV[0] then raise exception 'INJECTED_RESTORE_FAILURE';end if;return NEW;end $$;
 create trigger fixture_restore_checkpoint before insert on public.content_revisions for each row execute function public.fixture_restore_fault('checkpoint');
 create trigger fixture_restore_update before update on public.pages for each row execute function public.fixture_restore_fault('update');
 create trigger fixture_restore_audit before insert on public.audit_logs for each row execute function public.fixture_restore_fault('audit');
 do $$declare step text;failed boolean;before_row jsonb;after_row jsonb;before_revs bigint;before_audit bigint;begin
 foreach step in array array['checkpoint','update','audit'] loop
  select to_jsonb(p) into before_row from public.pages p where id='${id}';select count(*) into before_revs from public.content_revisions where entity_id='${id}';select count(*) into before_audit from public.audit_logs where entity_id='${id}';
  perform set_config('heba_test.restore_fault',step,true);failed:=false;
  begin perform public.restore_content_revision_atomic('${actor}','${revision}',2);exception when others then if sqlerrm<>'INJECTED_RESTORE_FAILURE' then raise;end if;failed:=true;end;
  select to_jsonb(p) into after_row from public.pages p where id='${id}';
  if not failed or after_row<>before_row or (select count(*) from public.content_revisions where entity_id='${id}')<>before_revs or (select count(*) from public.audit_logs where entity_id='${id}')<>before_audit then raise exception 'RESTORE_WAS_PARTIAL';end if;
 end loop;end $$;rollback;`)
 assert.deepEqual(state(),baseline);console.log('PASS injected checkpoint, update and audit failures roll back the entire restore')
 let ready;const acquired=new Promise(r=>ready=r),expected=version()
 const first=start(`begin;${role}${call(expected)}\n\\echo RESTORE_LOCK_HELD\nselect pg_sleep(1.2);commit;`,chunk=>{if(chunk.includes('RESTORE_LOCK_HELD'))ready()})
 await Promise.race([acquired,first.then(()=>{throw Error('Restore did not obtain its row lock')})])
 const second=start(`begin;set local lock_timeout='8s';${role}${call(expected)}commit;`)
 const [a,b]=await Promise.all([first,second]);assert.equal(a.code,0);assert.notEqual(b.code,0);assert.match(b.stderr,/content_version_conflict/);assert.equal(version(),expected+1);assert.equal(state().audits,2)
 console.log('PASS two real concurrent restores: one commit, one version conflict, one new checkpoint/audit')
 let edited;const editLock=new Promise(r=>edited=r),oldVersion=version()
 const edit=start(`begin;update public.pages set title='تعديل أحدث من محرر آخر' where id='${id}';\n\\echo EDIT_LOCK_HELD\nselect pg_sleep(1.2);commit;`,chunk=>{if(chunk.includes('EDIT_LOCK_HELD'))edited()})
 await Promise.race([editLock,edit.then(()=>{throw Error('Edit did not obtain its row lock')})])
 const restore=start(`begin;${role}${call(oldVersion)}commit;`)
 const [e,r]=await Promise.all([edit,restore]);assert.equal(e.code,0);assert.notEqual(r.code,0);assert.match(r.stderr,/content_version_conflict/);assert.equal(state().row.title,'تعديل أحدث من محرر آخر');assert.equal(state().audits,2)
 assert.equal(run("select has_function_privilege('anon','public.restore_content_revision_atomic(uuid,uuid,bigint)','execute') or has_function_privilege('authenticated','public.restore_content_revision_atomic(uuid,uuid,bigint)','execute')"),'f')
 console.log('PASS ordinary concurrent edit advances version and is preserved; browser-role execution denied')
}finally{
 run(`begin;delete from public.audit_logs where entity_id='${id}';delete from public.content_revisions where entity_id='${id}';delete from public.pages where id='${id}';commit;`)
}
