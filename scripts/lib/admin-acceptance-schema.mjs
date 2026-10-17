import {readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {literal,schemaInventory} from './admin-acceptance-db.mjs'
import {safeFailure} from './admin-acceptance-config.mjs'
export const normalized=text=>text.replaceAll('\r\n','\n').trim()
export function sourceMigrations(){const rows=readdirSync('supabase/migrations').filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort().map(file=>({file,version:file.slice(0,3),sql:readFileSync('supabase/migrations/'+file,'utf8')}));if(rows.length!==113||rows.some((row,index)=>Number(row.version)!==index))throw Error('MIGRATION_SEQUENCE_REQUIRES_REVIEW');return rows}
export function migrationPlan(state,source=sourceMigrations()){
 const installed=new Map(state.migrations.map(row=>[row.version,row])),missing=[];let gap=false
 for(const row of source){const found=installed.get(row.version);if(!found){gap=true;missing.push(row.version);continue}if(gap)throw Error('MIGRATION_HISTORY_GAP');if(!Array.isArray(found.statements)||normalized(found.statements.join('\n'))!==normalized(row.sql))throw Error('APPLIED_MIGRATION_SOURCE_DIFFERS')}
 if([...installed.keys()].some(v=>!source.some(row=>row.version===v)))throw Error('UNKNOWN_MIGRATION_HISTORY')
 if(!state.control&&(state.users||state.objects||(!installed.size&&(state.tables.length||state.functions||state.storagePolicies))))throw Error('NONEMPTY_UNOWNED_TEST_PROJECT')
 return {state:!installed.size?'empty':missing.length?'partial':'current',missing,source}
}
const critical=['is_admin','has_permission','get_admin_security_readiness','owner_password_assured','restore_content_revision_atomic','initialize_home_draft','begin_protected_upload_intent','bind_validated_protected_upload','admin_register_media','admin_customer_directory_page','admin_customer_history_page','booking_runtime_contract','launch_runtime_contract']
export function transactionBody(sql){
 // Six historical source files own an outer transaction. Keep their original
 // text in history, but let the runner atomically commit SQL AND that history.
 return sql.replace(/^begin;\s*$/im,'').replace(/^commit;\s*$/im,'')
}
export async function verifyDefinitions(query,source){
 const expected=new Map()
 for(const row of source)for(const m of row.sql.matchAll(/create(?:\s+or\s+replace)?\s+function\s+public\.(\w+)\s*\([\s\S]*?\bas\s+\$(\w*)\$([\s\S]*?)\$\2\$/gi))if(critical.includes(m[1]))expected.set(m[1],normalized(m[3]))
 if(source.at(-1)?.version==='112'&&expected.size!==critical.length)throw Error('DEFINITION_SOURCE_INDEX_INCOMPLETE')
 const rows=await query("select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'body',p.prosrc)),'[]') as functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'",{readOnly:true}),actual=rows[0]?.functions??rows
 for(const [name,body] of expected)if(!actual.some(row=>row.name===name&&normalized(row.body)===body))throw Error('RUNTIME_DEFINITION_DIFFERS_'+name.toUpperCase())
 return expected.size
}
export async function initializeSchema(config,query,{apply=false}={}){
 const before=await schemaInventory(query),plan=migrationPlan(before),appliedSource=plan.source.filter(row=>!plan.missing.includes(row.version))
 if(before.control&&(before.owners.length!==1||before.owners[0]!==config.ref))throw Error('TEST_PROJECT_MARKER_MISMATCH')
 if(appliedSource.length)await verifyDefinitions(query,appliedSource)
 const report={project:config.ref,state:plan.state,missing:plan.missing,applied:[],productionChanged:false}
 if(!apply)return {...report,next:plan.missing.length?'راجعي الخطة ثم شغلي --apply للمشروع الاختباري المحدد.':'المخطط مسجل؛ يلزم قبول التشغيل الحقيقي.'}
 // Dedicated test ownership marker. No destructive reset/adoption of an occupied project.
 await query(`begin;create schema if not exists heba_acceptance_control;revoke all on schema heba_acceptance_control from public,anon,authenticated;create table if not exists heba_acceptance_control.project(ref text primary key,created_at timestamptz default now());do $$ begin if exists(select 1 from heba_acceptance_control.project where ref<>${literal(config.ref)})then raise exception 'test_project_marker_mismatch';end if;end $$;insert into heba_acceptance_control.project(ref)values(${literal(config.ref)})on conflict do nothing;create table if not exists heba_acceptance_control.runs(id uuid primary key,manifest jsonb not null,created_at timestamptz default now(),cleaned_at timestamptz);create table if not exists heba_acceptance_control.applied(version text primary key,sha256 text not null);create schema if not exists supabase_migrations;create table if not exists supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);commit;select '{}'::json as result;`)
 for(const row of plan.source.filter(row=>plan.missing.includes(row.version))){
  const current=await schemaInventory(query);migrationPlan(current,plan.source) // recheck partial state before each mutation
  const hash=createHash('sha256').update(normalized(row.sql)).digest('hex')
  try{await query(`begin;set local lock_timeout='10s';set local statement_timeout='90s';${transactionBody(row.sql)}\ninsert into supabase_migrations.schema_migrations(version,name,statements)values(${literal(row.version)},${literal(row.file.slice(4,-4))},array[${literal(row.sql)}]);insert into heba_acceptance_control.applied(version,sha256)values(${literal(row.version)},${literal(hash)});commit;select '{}'::json as result;`)}catch(cause){const error=Error(`MIGRATION_${row.version}_FAILED_${safeFailure(cause)}`);error.schemaReport={...report,failedVersion:row.version};throw error}
  report.applied.push(row.version)
 }
 await query("notify pgrst,'reload schema';select '{}'::json as result;")
 report.verifiedFunctions=await verifyDefinitions(query,plan.source)
 return {...report,state:'schema_applied_not_accepted',next:'شغلي القبول الحقيقي؛ لم تُنشأ حسابات أو تُنسخ بيانات إنتاج.'}
}
