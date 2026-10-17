import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {UPLOAD_LIMITS,getUploadLimit,uploadSizeAllowed,uploadLimitLabel} from '../src/lib/uploads/limits.mjs'
import {getUploadRule,validateObservedFile} from '../src/lib/delivery/file-validation.mjs'
const source=ts.createSourceFile('admin-control.ts',readFileSync('src/lib/actions/admin-control.ts','utf8'),ts.ScriptTarget.Latest,true)
const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='validateMediaUpload')
const code=ts.transpileModule('export '+fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,uploadSizeAllowed,uploadLimitLabel})
for(const [bucket,max] of Object.entries(UPLOAD_LIMITS))for(const delta of [-1,0,1]){
 const size=max+delta,expected=delta<=0
 assert.equal(uploadSizeAllowed(bucket,size),expected)
 const input={bucket,name:bucket==='course-videos'||bucket==='workshop-recordings'?'clip.mp4':'document.pdf',type:bucket==='course-videos'||bucket==='workshop-recordings'?'video/mp4':'application/pdf',size,title:'ملف اختبار حدود',alt:'وصف الملف',rightsStatus:'owned',rightsReference:'test only'}
 assert.equal('error' in mod.exports.validateMediaUpload(input),!expected,`${bucket}/${size}`)
}
for(const size of [0,-1,NaN,Infinity,1.5])assert.equal(uploadSizeAllowed('protected-books',size),false)
assert.equal(getUploadLimit('unknown-bucket'),0)
for(const kind of ['book','lesson-video','lesson-resource','workshop-resource','workshop-recording']){
 const rule=getUploadRule(kind);assert.equal(rule.max,getUploadLimit(rule.bucket))
}
const rule=getUploadRule('book'),type=rule.extensions.pdf,bytes=new TextEncoder().encode('%PDF-1.7')
for(const size of [rule.max-1,rule.max,rule.max+1])assert.equal(validateObservedFile({rule,type,declaredMime:'application/pdf',declaredSize:size,observed:{bytes,size,mime:'application/pdf'}}),size<=rule.max)
console.log('PASS shared browser preflight and actual server validator: below/at/above all five bucket limits, invalid sizes and unknown bucket')
console.log('PASS protected upload rules and actual observed-file validation use the same byte caps')
