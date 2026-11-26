import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {defaultGuidedAssessmentContent,validateGuidedAssessmentContent} from '../src/lib/assessments/governance.ts'
const source=ts.createSourceFile('assessments.ts',readFileSync('src/lib/data/assessments.ts','utf8'),ts.ScriptTarget.Latest,true)
const fn=source.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='getPublishedGuidedAssessment')
let readError=null,row={id:'version-1',version:1,published_at:'2026-10-17',content:defaultGuidedAssessmentContent,guided_assessments:{name:'اختبار خاص',slug:'start-here',published_version_id:'version-1'}}
let selected=''
const query={select(value){selected=value;return this},eq(){return this},limit(){return this},async maybeSingle(){return {data:row,error:readError}}}
const sandboxModule={exports:{}}
vm.runInNewContext(ts.transpileModule(fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:sandboxModule,exports:sandboxModule.exports,hasSupabasePublicConfig:()=>true,getServerClient:async()=>({from:()=>query}),validateGuidedAssessmentContent})
const run=sandboxModule.exports.getPublishedGuidedAssessment
assert.equal((await run()).version,1)
assert(selected.includes('guided_assessments!assessment_id!inner('),'select the assessment_id relationship, not the reverse published pointer')
row.guided_assessments.published_version_id='another-version';assert.equal(await run(),null)
row.guided_assessments.published_version_id='version-1';row.content={};assert.equal(await run(),null)
readError={code:'PGRST201'};assert.equal(await run(),null)
const admin=readFileSync('src/app/admin/assessments/page.tsx','utf8')
assert(admin.includes('guided_assessments!assessment_id!inner('))
console.log('PASS actual assessment reader selects the unambiguous relationship and preserves published-pointer/content/error guards')
