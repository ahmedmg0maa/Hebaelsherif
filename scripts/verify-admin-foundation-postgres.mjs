import {spawnSync} from 'node:child_process'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
const {run}=isolatedPostgres()
if(!/^heba_test_/.test(process.env.PGDATABASE||''))throw Error('Use a disposable heba_test_ database, never the original restore')
if(run("select count(*) from supabase_migrations.schema_migrations where version in ('108','109','110','111','112')")!=='5')throw Error('Apply reviewed migrations 108–112 to the isolated target first')
for(const script of ['verify-atomic-restore-postgres.mjs','verify-restore-entities-postgres.mjs','verify-home-draft-postgres.mjs','verify-upload-limits-postgres.mjs','verify-admin-pagination-postgres.mjs']){
 const result=spawnSync(process.execPath,['scripts/'+script],{stdio:'inherit',env:process.env})
 if(result.status!==0)process.exit(result.status||1)
}
console.log('PASS five foundation PostgreSQL suites; no production endpoint used')
