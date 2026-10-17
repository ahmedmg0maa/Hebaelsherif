import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {projectRef} from './admin-acceptance-config.mjs'
export const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
// psql CSV retains column names, unlike tuples-only output. All runner queries
// finish with one result row, including migration batches with earlier SELECTs.
export function lastCsvRecord(text){
 const rows=[],row=[];let field='',quoted=false
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row.splice(0));field=''}else field+=c}
 if(field||row.length){row.push(field);rows.push(row)}
 if(rows.length<2)return []
 const [names,values]=rows.slice(-2)
 if(names.length!==values.length)throw Error('DATABASE_RESPONSE_INVALID')
 return [Object.fromEntries(names.map((name,index)=>{let value=values[index];try{value=JSON.parse(value)}catch{if(value==='t')value=true;else if(value==='f')value=false}return [name,value]}))]
}
export function acceptanceDatabase(config){
 if(projectRef(config.url)!==config.ref)throw Error('DATABASE_PROJECT_MISMATCH')
 if(config.database){const db=new URL(config.database);if(!['postgres:','postgresql:'].includes(db.protocol)||!(db.hostname===`db.${config.ref}.supabase.co`||(db.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(db.username)===`postgres.${config.ref}`)))throw Error('DATABASE_PROJECT_MISMATCH')}
 return async function query(sql,{readOnly=false}={}){
  if(config.managementToken){
   const response=await fetch(`https://api.supabase.com/v1/projects/${config.ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${config.managementToken}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:readOnly}),signal:AbortSignal.any([AbortSignal.timeout(120000),...(config.signal?[config.signal]:[])])})
   if(!response.ok)throw Error(`DATABASE_HTTP_${response.status}`)
   const data=await response.json();if(!Array.isArray(data))throw Error('DATABASE_RESPONSE_INVALID');return data
  }
  if(!config.database)throw Error('DATABASE_SETUP_ACCESS_REQUIRED')
  const u=new URL(config.database),bundled=resolve('.launch-tools/postgresql-17.11/pgsql/bin/psql.exe')
  const r=spawnSync(existsSync(bundled)?bundled:'psql',['-X','-q','--csv','-w','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:120000,windowsHide:true,env:{...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:u.pathname.slice(1)||'postgres',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:'require',PGCLIENTENCODING:'UTF8',PGOPTIONS:readOnly?'-c default_transaction_read_only=on':''}})
  if(r.status!==0)throw Error('DATABASE_SQL_FAILED')
  return lastCsvRecord(r.stdout.trim())
 }
}
export const inventorySql=`select jsonb_build_object(
 'tables',(select coalesce(jsonb_agg(tablename order by tablename),'[]') from pg_tables where schemaname='public'),
 'users',(select count(*) from auth.users),'objects',(select count(*) from storage.objects),
 'history',to_regclass('supabase_migrations.schema_migrations') is not null,
 'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),
 'storagePolicies',(select count(*) from pg_policies where schemaname='storage'),
 'control',to_regclass('heba_acceptance_control.project') is not null) as inventory`;
export async function schemaInventory(query){
 const rows=await query(inventorySql,{readOnly:true}),state=rows[0]?.inventory??rows[0]
 if(!state||!Array.isArray(state.tables)||!Number.isSafeInteger(state.users))throw Error('SCHEMA_INVENTORY_INVALID')
 const versions=state.history?await query("select coalesce(jsonb_agg(jsonb_build_object('version',version,'statements',statements) order by version),'[]') as migrations from supabase_migrations.schema_migrations",{readOnly:true}):[]
 const owners=state.control?await query("select coalesce(jsonb_agg(ref),'[]') as refs from heba_acceptance_control.project",{readOnly:true}):[]
 return {...state,owners:owners[0]?.refs??[],migrations:versions[0]?.migrations??(Array.isArray(versions[0])?versions[0]:[])}
}
