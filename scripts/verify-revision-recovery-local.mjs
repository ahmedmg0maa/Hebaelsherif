import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
let fresh=true,allowed=true,response={data:{id:'restored',kind:'article',slug:'old-article',previousSlug:'new-article'},error:null}
const calls=[],paths=[],id='d5e0e349-f5d4-42de-a555-601a2c00f001',mod={exports:{}}
const code=ts.transpileModule(readFileSync('src/lib/actions/revisions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{
 if(name==='next/cache')return{revalidatePath:p=>paths.push(p)}
 if(name==='@/lib/auth/permissions')return{FRESH_ADMIN_ASSURANCE_ERROR:'أعيدي تأكيد الدخول',requirePermission:async()=>allowed?{userId:'owner'}:null,requireFreshAdminAssurance:async()=>fresh?{userId:'owner'}:null}
 if(name==='@/lib/supabase/server')return{getServiceClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return response}})}
 throw Error('Unexpected dependency '+name)
}})
const {prepareContentRevisionRestore,restoreContentRevision}=mod.exports
response={data:{version:3,title:'المحتوى الحالي'},error:null}
assert.equal((await prepareContentRevisionRestore(id)).version,3)
assert.equal(calls.at(-1).name,'admin_content_restore_context')
allowed=false;const count=calls.length;assert.equal((await prepareContentRevisionRestore(id)).ok,false);assert.equal(calls.length,count);allowed=true
fresh=false;assert.equal((await restoreContentRevision(id,3)).ok,false);assert.equal(calls.length,count);fresh=true
assert.equal((await restoreContentRevision(id,undefined)).ok,false);assert.equal(calls.length,count)
response={data:null,error:{code:'40001'}}
assert.match((await restoreContentRevision(id,3)).error,/تغيّر المحتوى/)
assert.equal(calls.at(-1).args.p_expected_version,3);assert.equal(paths.length,0)
response={data:null,error:{code:'P0002'}};assert.match((await restoreContentRevision(id,3)).error,/غير موجود/)
response={data:{id:'restored',kind:'article',slug:'old-article',previousSlug:'new-article'},error:null}
assert.equal((await restoreContentRevision(id,3)).ok,true)
assert.equal(calls.at(-1).name,'restore_content_revision_atomic')
for(const p of ['/articles/old-article','/articles/new-article','/admin/revisions','/search','/sitemap.xml'])assert(paths.includes(p))
assert(!readFileSync('src/lib/actions/revisions.ts','utf8').includes('.from('),'action must not split the transaction into table writes')
console.log('PASS actual restore actions: read version, deny missing assurance/version, atomic RPC, stale/deleted feedback and old/new route invalidation')
console.log('Database rollback/concurrency evidence is separately required: verify-atomic-restore-postgres.mjs')
