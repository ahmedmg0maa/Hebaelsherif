import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {createRequire} from 'node:module'
import {renderToStaticMarkup} from 'react-dom/server'
import {normalizeCmsProse} from '../src/lib/cms/prose.ts'
const require=createRequire(import.meta.url)
function compile(source,bindings={},imports={}){
 const sandboxModule={exports:{}}
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{module:sandboxModule,exports:sandboxModule.exports,require:name=>name in imports?imports[name]:require(name),...bindings})
 return sandboxModule.exports
}
assert.equal(normalizeCmsProse(null),null)
assert.equal(normalizeCmsProse({heading:'عنوان بلا محتوى'}),null)
assert.deepEqual(normalizeCmsProse({title:'عنوان',text:'فقرة',paragraphs:['ثانية',''],bullets:['نقطة'],items:['أخرى']}),{heading:'عنوان',paragraphs:['فقرة','ثانية'],bullets:['نقطة','أخرى']})
let row={title:'صفحة معتمدة',updated_at:'2026-10-17',seo_title:'عنوان البحث',seo_description:'وصف البحث',canonical_url:null,og_image_url:null,legal_review_status:'not_applicable',legal_version:null,effective_at:null,page_sections:[{id:'hidden',sort:0,is_visible:false,content:{heading:'مخفي',body:'لا يظهر'}},{id:'visible',sort:1,is_visible:true,content:{heading:'ظاهر',body:'نص <script> حرفي'}}]}
const conditions=[]
const query={select(){return this},eq(k,v){conditions.push([k,v]);return this},async maybeSingle(){return {data:row,error:null}}}
const file=ts.createSourceFile('cms.ts',readFileSync('src/lib/data/cms.ts','utf8'),ts.ScriptTarget.Latest,true)
const fn=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='getPublishedCmsPage')
const data=compile(fn.getText(file),{hasEnv:()=>true,getServerClient:async()=>({from:()=>query})})
const page=await data.getPublishedCmsPage('custom-page')
assert.deepEqual(conditions,[['slug','custom-page'],['status','published'],['is_published',true]])
assert.equal(page.sections.length,1);assert.equal(page.sections[0].id,'visible');assert.equal(page.seoTitle,'عنوان البحث')
row={...row,legal_review_status:'pending'}
assert.equal(await data.getPublishedCmsPage('privacy'),null)
console.log('PASS actual CMS reader explicitly filters published pages and visible sections, including an Admin viewing the public page; legal approval retained')
const prose=compile(readFileSync('src/components/catalog/ProsePage.tsx','utf8'))
const route=compile(readFileSync('src/app/(public)/[slug]/page.tsx','utf8'),{}, {
 'next/navigation':{notFound(){throw Error('NOT_FOUND')}},
 '@/lib/data/cms':{getPublishedCmsPage:async slug=>slug==='custom-page'?page:null},
 '@/lib/cms/prose':{normalizeCmsProse},
 '@/components/catalog/ProsePage':prose,
})
await assert.rejects(()=>route.default({params:Promise.resolve({slug:'unknown-page'})}),/NOT_FOUND/)
await assert.rejects(()=>route.default({params:Promise.resolve({slug:'bad/slug'})}),/NOT_FOUND/)
const html=renderToStaticMarkup(await route.default({params:Promise.resolve({slug:'custom-page'})}))
assert.ok(html.includes('صفحة معتمدة')&&html.includes('ظاهر')&&!html.includes('مخفي'))
assert.ok(html.includes('&lt;script&gt;')&&!html.includes('<script>'))
const meta=await route.generateMetadata({params:Promise.resolve({slug:'custom-page'})})
assert.equal(meta.title,'عنوان البحث');assert.equal(meta.description,'وصف البحث');assert.equal(meta.alternates.canonical,'/custom-page')
console.log('PASS actual managed route: known published content, unknown/draft 404, escaped prose, hidden exclusion and saved SEO metadata')
