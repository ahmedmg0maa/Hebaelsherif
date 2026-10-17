import {readFileSync,readdirSync} from 'node:fs'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run}=isolatedPostgres()
if(!/^heba_test_/.test(process.env.PGDATABASE||''))throw Error('Use an explicitly prepared disposable heba_test_ clone; the original restore must be retained')
const applied=new Set(run('select version from supabase_migrations.schema_migrations').split('\n'))
const actual=JSON.parse(run("select json_agg(x) from(select proname,md5(prosrc) source_md5,prosrc body from pg_proc where pronamespace='public'::regnamespace)x"))
const expected=JSON.parse(readFileSync('docs/admin-current-state-evidence/database-and-release.json','utf8')).functions
const norm=s=>s.replace(/\r\n/g,'\n').trim(),scheduler=readFileSync('supabase/migrations/105_course_content_and_publication_jobs.sql','utf8').match(/create function public\.process_catalog_publication_jobs\([\s\S]*?as \$\$([\s\S]*?)\$\$;/)?.[1]
for(const item of expected){if(item.proname==='admin_register_media'&&applied.has('110'))continue;const match=actual.some(row=>row.proname===item.proname&&(item.proname==='process_catalog_publication_jobs'?scheduler&&norm(row.body)===norm(scheduler):row.source_md5===item.source_md5));if(!match)throw Error('Isolated baseline differs; review it before applying new SQL: '+item.proname)}
const literal=s=>"'"+s.replaceAll("'","''")+"'"
for(const file of readdirSync('supabase/migrations').filter(name=>/^(108|109|110|111|112)_.*\.sql$/.test(name)).sort()){
 const version=file.slice(0,3),sql=readFileSync('supabase/migrations/'+file,'utf8');if(applied.has(version)){console.log('Already recorded in isolated database: '+version+'; runtime suites still required');continue}
 run(`begin;set local lock_timeout='10s';${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements)values('${version}',${literal(file.slice(4,-4))},array[${literal(sql)}]);commit;`)
 console.log('Applied to isolated clone only: '+version)
}
