import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadCatalogSource, catalogForm } from './catalog-test-fixture.mjs'
const { commerceEditorPayload: parse } = loadCatalogSource('src/lib/admin/commerce-editor.ts')
const form = values => { const f = new FormData(); for (const [k,v] of Object.entries(values)) for (const x of Array.isArray(v) ? v : [v]) f.append(k,String(x)); return f }
export const commerceForm = form
export const valid = {
  variant: { name: 'نسخة كاملة', price: '75.50', is_active: 'on' },
  plan: { title: 'باقة تجريبية', slug: 'test-plan', price: '200', currency: 'EGP', billing_interval: 'month', duration_days: '30', sessions_included: '5', is_active: 'on' },
  coupon: { code: 'SAVE10', kind: 'percent', value: '10', max_uses_per_user: '1' },
  offer: { title: 'عرض تجريبي', kind: 'seasonal', discount_kind: 'percent', discount_value: '15', targets: '[]' },
}
export const payload = (kind, overrides = {}) => {
  const parsed = parse(kind, kind === 'program' ? catalogForm('course',{ type:'bundle', ...overrides }) : form({ ...valid[kind], ...overrides }))
  assert.equal(parsed.ok,true,JSON.stringify(parsed)); return parsed.value
}
let checks = 0
assert.match(parse('offer',form({...valid.offer,discount_value:'101'})).error,/100٪/)
assert.match(parse('coupon',form({...valid.coupon,value:'101'})).error,/الكوبون.*100٪/)
assert.match(parse('offer',form({...valid.offer,starts_at:'2099-01-03T12:00',ends_at:'2099-01-02T12:00'})).error,/بعد موعد البداية/)
for (const kind of ['program','variant','plan','coupon','offer']) { payload(kind); checks++ }
for (const [kind,fields] of [
  ['program',{ type:'course' }], ['program',{ type:'free_resource',price:'12' }], ['program',{price:'NaN'}],
  ['variant',{price:'1.234'}], ['variant',{price:'-1'}], ['plan',{duration_days:'0'}], ['plan',{max_subscribers:'1.5'}],
  ['plan',{eligible_service_ids:'invalid'}], ['plan',{currency:'USDX'}], ['coupon',{value:'101'}], ['coupon',{kind:'unknown'}],
  ['coupon',{max_uses_per_user:'0'}], ['offer',{discount_value:'Infinity'}], ['offer',{kind:'unknown'}], ['offer',{targets:'[{"unknown":true}]'}],
  ['offer',{starts_at:'2099-01-03T12:00',ends_at:'2099-01-02T12:00'}], ['plan',{starts_at:'not-a-date'}],
]) { assert.equal(parse(kind,kind==='program'?catalogForm('course',{type:'bundle',...fields}):form({...valid[kind],...fields})).ok,false,`${kind} ${JSON.stringify(fields)}`); checks++ }
const offer=payload('offer',{ targets: JSON.stringify([{product_type:'course'},{category:'growth',product_type:'book'}]), starts_at:'2099-01-15T12:00' })
assert.equal(offer.targets.length,2); assert.equal(offer.starts_at,'2099-01-15T10:00:00.000Z'); checks++
const action=readFileSync('src/lib/actions/marketing.ts','utf8')
assert.ok(action.includes("rpc('manage_commerce_record'")); assert.ok(!action.includes('.from(')); checks++
for(const name of ['087_atomic_commerce_administration_local_only.sql','088_subscription_contract_preservation_local_only.sql','089_site_operation_controls_local_only.sql']) {
 const sql=readFileSync(`supabase/migrations/${name}`,'utf8');assert.match(sql,/begin;/);assert.match(sql,/commit;/);assert.match(sql,/revoke all on function/);checks++
}
console.log(`PASS ${checks} commerce administration normalization/contracts (not SQL runtime or RLS acceptance)`)
