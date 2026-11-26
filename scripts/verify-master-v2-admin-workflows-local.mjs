import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createAdminActionRunner } from '../src/lib/admin/action-runner.ts'
import { formatCairoLocalDateTime, parseCairoLocalDateTime } from '../src/lib/booking/cairo-time.ts'

// Execute concurrency and failure recovery. A second click must not call the
// operation, while a later deliberate retry must work after either outcome.
const run = createAdminActionRunner()
let complete, calls = 0
const pending = run(() => { calls++; return new Promise(resolve => { complete = resolve }) })
assert.equal(await run(async () => { calls++; return { ok: true } }), undefined)
assert.equal(calls, 1)
complete({ ok: true })
assert.deepEqual(await pending, { ok: true })
assert.deepEqual(await run(async () => ({ ok: false, error: 'رفض متوقع' })), { ok: false, error: 'رفض متوقع' })
const failure = await run(async () => { throw new Error('SYNTHETIC_PROVIDER_DETAIL') })
assert.equal(failure.ok, false)
assert.ok(!failure.error.includes('SYNTHETIC_PROVIDER_DETAIL'))
assert.ok(failure.error.includes('راجعي السجل'))
assert.deepEqual(await run(async () => ({ ok: true })), { ok: true })

// Dates retain the stored instant when an unchanged Cairo field is submitted.
for (const instant of ['2026-01-15T10:00:00.000Z', '2026-07-15T09:00:00.000Z']) {
  const wallTime = formatCairoLocalDateTime(instant)
  assert.equal(wallTime.slice(11), '12:00')
  assert.equal(parseCairoLocalDateTime(wallTime)?.toISOString(), instant)
}
assert.equal(formatCairoLocalDateTime('invalid'), null)
for (const invalid of ['2026-02-30T10:00', '2026-01-15T24:01', 'bad']) assert.equal(parseCairoLocalDateTime(invalid), null)

// Real React SSR verifies repeated field names produce distinct labels/help IDs.
// This is server markup evidence, not browser, focus-trap or mobile acceptance.
const require = createRequire(import.meta.url)
function loadSource(path) {
  const loadedModule = { exports: {} }
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  const sourceRequire = name => name === '@/lib/cn' ? loadSource('src/lib/cn.ts') : require(name)
  new Function('require', 'module', 'exports', compiled)(sourceRequire, loadedModule, loadedModule.exports)
  return loadedModule.exports
}
const { FormField, FormTextarea, FormSelect } = loadSource('src/components/ui/FormField.tsx')
const markup = renderToStaticMarkup(createElement(Fragment, null,
  createElement(FormField, { name: 'title', label: 'الأول', hint: 'مساعدة' }),
  createElement(FormField, { name: 'title', label: 'الثاني', error: 'خطأ' }),
  createElement(FormTextarea, { id: 'chosen-id', name: 'title', label: 'الثالث', hint: 'مساعدة' }),
  createElement(FormSelect, { name: 'title', label: 'الرابع', options: [{ value: 'draft', label: 'مسودة' }] }),
))
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
assert.equal(new Set(ids).size, ids.length, 'duplicate field/help IDs')
for (const [, target] of markup.matchAll(/(?:for|aria-describedby)="([^"]+)"/g)) assert.ok(ids.includes(target), `missing label/help target ${target}`)
assert.ok(markup.includes('for="chosen-id"'))
assert.ok(markup.includes('id="chosen-id-feedback"'))

const read = path => readFileSync(path, 'utf8')
for (const name of ['ArticleEditor', 'ArticleScheduleControl', 'CatalogManager', 'ProductManager', 'BookingEditor', 'MembershipManager', 'ApprovalActions', 'OrderActions', 'AvailabilityManager', 'PressManager', 'ResourceManager', 'MarketingForms', 'CurriculumForms', 'CurriculumItemEditors', 'InboxControls']) {
  const source = read(`src/components/admin/${name}.tsx`)
  assert.ok(source.includes('useAdminAction'), `${name} lacks guarded feedback`)
  assert.ok(!source.includes('setBusy('), `${name} retains an unguarded request`)
  assert.ok(!source.includes('event.currentTarget.reset()') && !source.includes('e.currentTarget.reset()'), `${name} resets an expired event target`)
}
for (const name of ['CatalogManager', 'BookingEditor', 'MembershipManager', 'PressManager', 'ResourceManager', 'MarketingForms']) {
  const source = read(`src/components/admin/${name}.tsx`)
  assert.ok(source.includes('formatCairoLocalDateTime') && source.includes('القاهرة'), `${name} lacks explicit Cairo input`)
  assert.ok(!source.includes('getTimezoneOffset') && !/publish_at\?\.slice/.test(source))
}
const actions = read('src/lib/actions/admin-control.ts')
assert.ok(actions.includes('parseCairoLocalDateTime(raw)?.toISOString()'))
const saveCatalog = actions.split('export async function saveCatalogItem')[1].split('export async function saveProductRecord')[0]
assert.ok(saveCatalog.indexOf('catalogEditorPayload(kind, form)') < saveCatalog.indexOf("rpc('manage_catalog_item'"))
assert.ok(saveCatalog.includes('if (!parsed.ok) return parsed'))
const dialog = read('src/components/admin/AdminEditorDialog.tsx')
for (const contract of ['showModal()', 'onCancel', 'aria-labelledby', 'opener.focus', 'visited && children', "document.body.style.overflow = overflow"]) assert.ok(dialog.includes(contract))
assert.ok(!read('src/components/admin/ApprovalActions.tsx').includes('window.open'))
console.log('Master V2 Admin: duplicate requests, failure recovery, Cairo roundtrips, repeated field IDs and editor source contracts passed. No browser or database execution claimed.')
