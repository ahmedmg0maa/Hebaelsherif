import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {sourceLoader} from './lib/load-source.mjs'
let error=null;const filters=[],mutations=[]
const query={select(){return this},eq(k,v){filters.push([k,v]);return this},async maybeSingle(){return{data:null,error}}}
const load=sourceLoader({'@/lib/supabase/server':{getServiceClient:()=>({from:()=>query})},'next/image':({src,alt,style})=>createElement('img',{src,alt,style}),'@/components/motion/HeroLight':{HeroLight:()=>null}})
const {defaultHomeSections}=load('src/lib/home/sections.ts'),{defaultHomeCopy}=load('src/lib/home/hero.ts')
const {captureHomeSnapshot,compareHomeSnapshots,homeDraftSections}=load('src/lib/home/draft.ts')
const original=defaultHomeSections(),snapshot=captureHomeSnapshot(original,defaultHomeCopy)
assert.equal(snapshot.sections.length,6);assert.equal(snapshot.presentation.heroImage.url,'/images/learning/learning-desk.webp')
const rows=snapshot.sections.map((s,i)=>({...s,id:String(i),is_visible:s.isVisible}))
const copy=captureHomeSnapshot(homeDraftSections(rows),defaultHomeCopy)
assert.equal(JSON.stringify(snapshot),JSON.stringify(copy))
assert(compareHomeSnapshots(snapshot,copy).sections.every(s=>!s.contentChanged&&!s.orderChanged&&!s.visibilityChanged))
const hidden=structuredClone(rows);hidden[2].is_visible=false;hidden[3].sort=7;hidden[0].content.lead='نص جديد خاص بالمسودة للمراجعة فقط'
const differences=compareHomeSnapshots(snapshot,captureHomeSnapshot(homeDraftSections(hidden),defaultHomeCopy))
assert(differences.sections.find(s=>s.kind==='pathways').visibilityChanged)
assert(differences.sections.find(s=>s.kind==='hero').contentChanged)
assert(differences.sections.find(s=>s.kind==='editorial_feature').orderChanged)
const {Hero}=load('src/components/home/Hero.tsx')
const before=renderToStaticMarkup(createElement(Hero,{copy:original[0].content})),after=renderToStaticMarkup(createElement(Hero,{copy:copy.sections[0].content}))
assert.equal(before,after)
const {loadHomeDraftSource}=load('src/lib/data/home-draft.ts')
assert.equal(JSON.stringify((await loadHomeDraftSource()).snapshot),JSON.stringify(snapshot))
assert(filters.some(([k,v])=>k==='status'&&v==='published'));assert(filters.some(([k,v])=>k==='is_published'&&v===true));assert(filters.some(([k,v])=>k==='is_public'&&v===true))
error={message:'provider failure'};await assert.rejects(loadHomeDraftSource,/HOME_PUBLIC_SOURCE_READ_UNAVAILABLE/)
console.log('PASS actual default→draft snapshot preserves six sections, order, copy, image and links; actual Hero SSR remains identical')
console.log('PASS hidden/order/text differences are detected; failed public-source read cannot become an empty/default persisted draft')
const failed=sourceLoader({'@/lib/auth/permissions':{requirePermission:async()=>({userId:'owner'})},'@/lib/data/home-draft':{loadHomeDraftSource:async()=>{throw Error('read failed')}},'@/lib/supabase/server':{getServiceClient:()=>({rpc:()=>mutations.push('unexpected')})},'next/cache':{revalidatePath:p=>mutations.push(p)}})('src/lib/actions/home-draft.ts')
assert.equal((await failed.initializeHomeDraft()).ok,false);assert.equal(mutations.length,0)
console.log('PASS actual initialization action refuses mutation/invalidation when source capture fails')

const profile={professionalLine:'تعريف مهني معتمد للمقارنة',credentials:[{value:'اعتماد موثق',label:'وصف معتمد',verified:true},{value:'لا يظهر',label:'غير موثق',verified:false}]}
const actual=captureHomeSnapshot(original,defaultHomeCopy,profile)
const display=compareHomeSnapshots(actual,actual)
assert(display.sections.find(row=>row.kind==='hero').beforeText.includes(profile.professionalLine))
assert(display.sections.find(row=>row.kind==='trust').beforeText.includes('اعتماد موثق'))
assert(!display.sections.find(row=>row.kind==='trust').beforeText.includes('لا يظهر'))
assert(!display.sections.find(row=>row.kind==='trust').beforeText.includes('وعي واختيار'))
const withMedia=structuredClone(original),asset='00000000-0000-4000-8000-000000000001'
withMedia[0].content.media={main:{assetId:asset,alt:'صورة موثقة للمراجعة',x:20,y:80}}
const imageSnapshot=captureHomeSnapshot(withMedia,defaultHomeCopy,profile,{[asset]:{url:'/images/fixture.webp',alt:'صورة'}})
assert.equal(imageSnapshot.sections[0].content.media.main.assetId,asset)
assert.equal(imageSnapshot.sections[0].images[0].x,20)
assert(compareHomeSnapshots(actual,imageSnapshot).sections[0].imagesChanged)
console.log('PASS comparison uses actual public professional line/verified credentials, preserves selected Hero media and detects image/crop changes')
