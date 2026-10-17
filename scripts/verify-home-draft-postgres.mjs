import assert from 'node:assert/strict'
import {sourceLoader} from './lib/load-source.mjs'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run}=isolatedPostgres(),load=sourceLoader(),{defaultHomeSections}=load('src/lib/home/sections.ts'),{defaultHomeCopy}=load('src/lib/home/hero.ts'),{captureHomeSnapshot}=load('src/lib/home/draft.ts')
const snapshot=JSON.parse(JSON.stringify(captureHomeSnapshot(defaultHomeSections(),defaultHomeCopy))),literal=s=>"'"+s.replaceAll("'","''")+"'"
assert.equal(run("select count(*) from public.pages where slug='home'"),'0','Use an isolated database without an existing home page; no existing content will be overwritten')
const actor=run("select user_id from public.admin_roles where role='owner' limit 1"),role=`set request.jwt.claims='{"role":"service_role"}';`,payload=literal(JSON.stringify(snapshot))
let id
try{
 const result=JSON.parse(run(role+`select public.initialize_home_draft('${actor}',${payload}::jsonb);`));id=result.id;assert(result.created)
 const saved=JSON.parse(run(`select json_build_object('status',p.status,'published',p.is_published,'sections',(select json_agg(json_build_object('name',s.name,'kind',s.kind,'sort',s.sort,'isVisible',s.is_visible,'content',s.content) order by s.sort) from public.page_sections s where s.page_id=p.id),'baseline',(select snapshot from public.home_draft_baselines b where b.page_id=p.id)) from public.pages p where id='${id}'`))
 assert.equal(saved.status,'draft');assert.equal(saved.published,false);assert.deepEqual(saved.sections,snapshot.sections.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='images'))));assert.deepEqual(saved.baseline,snapshot)
 assert.equal(run("select count(*) from public.pages where slug='home' and is_published and status='published'"),'0')
 const retry=JSON.parse(run(role+`select public.initialize_home_draft('${actor}',${payload}::jsonb);`));assert.equal(retry.created,false);assert.equal(retry.id,id)
 assert.equal(run(`select count(*) from public.audit_logs where entity_id='${id}' and action='home.draft_initialized'`),'1')
 run(`update public.page_sections set content=jsonb_set(content,'{lead}','"تعديل خاص بالمسودة لا يغيّر العامة"') where page_id='${id}' and kind='hero'`)
 run(role+`select public.initialize_home_draft('${actor}',${payload}::jsonb);`)
 assert.equal(run(`select content->>'lead' from public.page_sections where page_id='${id}' and kind='hero'`),'تعديل خاص بالمسودة لا يغيّر العامة')
 assert.throws(()=>run(role+`select public.initialize_home_draft(gen_random_uuid(),${payload}::jsonb)`),/content_management_required/)
 assert.equal(run("select has_function_privilege('anon','public.initialize_home_draft(uuid,jsonb)','execute') or has_function_privilege('authenticated','public.initialize_home_draft(uuid,jsonb)','execute')"),'f')
 console.log('PASS committed draft and exact six-section baseline reload from PostgreSQL; public source remains absent/unchanged')
 console.log('PASS repeated initialization creates one audit, preserves edited draft and denies unauthorized/browser actors')
}finally{if(id)run(`begin;delete from public.audit_logs where entity_id='${id}';delete from public.pages where id='${id}';commit;`)}
