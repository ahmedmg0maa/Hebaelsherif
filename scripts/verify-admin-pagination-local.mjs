import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {sourceLoader} from './lib/load-source.mjs'
const all=Array.from({length:1257},(_,i)=>({id:String(i).padStart(5,'0'),title:i===0?'قديم 100%_مهم':'سجل '+i,status:i%2?'published':'draft',created_at:i}))
let fault='',configured=true,calls=[]
function from(table){let rows=all.slice(),start=0,end=24,orders=[],head=false;const query={
 select(columns,opts){head=opts.head===true;calls.push({table,columns,opts});return this},
 ilike(column,value){calls.push({ilike:[column,value]});const q=value.slice(1,-1).replace(/\\(.)/g,'$1').toLowerCase();rows=rows.filter(row=>String(row[column]).toLowerCase().includes(q));return this},
 eq(column,value){rows=rows.filter(row=>row[column]===value);return this},
 is(column,value){rows=rows.filter(row=>(row[column]??null)===value);return this},
 not(column,op,value){rows=rows.filter(row=>(row[column]??null)!==value);return this},
 in(column,values){rows=rows.filter(row=>values.includes(row[column]));return this},
 order(column,{ascending}){orders.push([column,ascending]);return this},range(a,b){start=a;end=b;return this},
 then(resolve){if(fault==='range416'&&start>=rows.length)return Promise.resolve(resolve({data:null,count:null,error:{code:'PGRST103'}}));if(head)return Promise.resolve(resolve({data:null,count:rows.length,error:null}));rows.sort((a,b)=>{for(const [key,asc]of orders){if(a[key]===b[key])continue;return (a[key]<b[key]?-1:1)*(asc?1:-1)}return 0});let data=rows.slice(start,end+1);if(fault==='truncated')data=data.slice(0,1);return Promise.resolve(resolve({data:fault==='null'?null:data,count:fault==='count'?null:rows.length,error:fault==='provider'?{code:'unavailable'}:null}))}
 };return query}
const load=sourceLoader({'@/lib/supabase/server':{getServerClient:async()=>({from})},'@/lib/supabase/public-key':{hasSupabasePublicConfig:()=>configured},'next/link':({children,...props})=>React.createElement('a',props,children)})
const {adminPagedList,adminPageFilters,adminRelatedRows}=load('src/lib/data/admin-pagination.ts')
const opts={searchColumn:'title',statuses:['draft','published']}
let first=await adminPagedList('fixture','id,title,status',{},opts);assert.equal(first.total,1257);assert.equal(first.rows.length,25)
const last=await adminPagedList('fixture','id,title,status',{page:'51'},opts);assert.equal(last.rows.at(-1).id,'00000');assert.equal(last.rows.length,7)
assert.equal((await adminPagedList('fixture','id,title',{page:'9999'},opts)).page,51)
fault='range416';assert.equal((await adminPagedList('fixture','id',{page:'9999'},opts)).page,51);fault=''
const searched=await adminPagedList('fixture','id,title',{q:'100%_مهم'},opts);assert.equal(searched.total,1);assert.equal(searched.rows[0].id,'00000');assert(calls.some(call=>call.ilike?.[1]==='%100\\%\\_مهم%'))
const filtered=await adminPagedList('fixture','id,title',{status:'published'},opts);assert.equal(filtered.total,628);assert(filtered.rows.every(row=>row.status==='published'))
for(const failure of ['provider','count','null','truncated']){fault=failure;await assert.rejects(()=>adminPagedList('fixture','id',{},opts),/ADMIN_PAGED_READ/)}fault=''
configured=false;assert.equal((await adminPagedList('fixture','id',{},opts)).configured,false);configured=true
assert.equal(adminPageFilters({page:'-1',status:'injected'},{statuses:['draft']}).page,1)
assert.equal(adminPageFilters({page:['1'],q:['bad']}).q,'')
const children=await adminRelatedRows('fixture','id','status',['draft']);assert.equal(children.length,629);assert(children.some(row=>row.id==='00000'))
const {AdminListTools}=load('src/components/admin/AdminListTools.tsx')
const html=renderToStaticMarkup(React.createElement(AdminListTools,{result:{...first,prefix:'message_'},query:{subscriber_q:'test@example.invalid',subscriber_page:'9'},label:'الرسائل'}))
assert(html.includes('subscriber_q'));assert(html.includes('subscriber_page'));assert(html.includes('1,257')||html.includes('١٬٢٥٧'));assert(html.includes('آخر صفحة'));assert(!html.includes('null'))
console.log('PASS actual pagination helper: 1257 records, oldest record, exact totals, literal wildcard search, filters, independent query namespaces and complete related reads')
console.log('PASS provider/truncation/missing count errors stay distinct from a confirmed empty list; unconfigured and invalid inputs handled')
