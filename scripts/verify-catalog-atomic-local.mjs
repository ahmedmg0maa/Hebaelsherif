import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { catalogEditorPayload, catalogForm, catalogPayload } from './catalog-test-fixture.mjs'

for (const kind of ['course', 'book', 'workshop', 'service']) assert.ok(catalogEditorPayload(kind, catalogForm(kind)).ok)
for (const [kind, fields] of [
  ['book', { price: '-1' }], ['book', { price: '1e3' }], ['book', { price: '10.001' }],
  ['book', { price: '100000000' }], ['book', { pages_count: '0' }], ['book', { currency: 'bad!' }],
  ['book', { slug: '../../admin' }], ['book', { cover_asset_id: 'invalid' }], ['book', { title: 'x'.repeat(181) }],
  ['book', { cover_url: 'javascript:alert(1)' }], ['service', { hold_minutes: '31' }],
  ['service', { duration_minutes: '10' }], ['service', { booking_window_days: '0' }],
  ['workshop', { starts_at: '2026-02-30T10:00' }], ['workshop', { ends_at: '2099-01-14T10:00' }],
]) assert.equal(catalogEditorPayload(kind, catalogForm(kind, fields)).ok, false, JSON.stringify(fields))
assert.equal(catalogPayload('workshop', { starts_at: '2026-07-15T12:00', ends_at: '2026-07-15T13:00' }).starts_at, '2026-07-15T09:00:00.000Z')
const fileForm = catalogForm('book'); fileForm.set('title', new Blob(['invalid']))
assert.equal(catalogEditorPayload('book', fileForm).ok, false)
assert.equal(catalogPayload('book', { pages_count: '', compare_at_price: '' }).pages_count, null)

const read = path => readFileSync(path, 'utf8')
const actions = read('src/lib/actions/admin-control.ts')
for (const name of ['saveCatalogItem', 'deleteCatalogItem']) {
  const body = actions.split(`export async function ${name}`)[1].split('\nexport async function ')[0]
  assert.ok(body.includes("rpc('manage_catalog_item'"))
  assert.ok(!/\.(insert|update|delete)\(/.test(body), `${name} must not split transaction writes`)
}
const sql = read('supabase/migrations/086_atomic_catalog_editor_local_only.sql')
for (const contract of ['catalog.publish', 'catalog.manage', 'catalog.delete', 'for update', 'catalog_require_publication_ready', 'catalog_history_exists', 'insert into public.content_revisions', 'insert into public.audit_logs', 'from public,anon,authenticated', 'to service_role']) assert.ok(sql.includes(contract))
console.log('Atomic catalog: actual form validator + service action/SQL source contracts passed. Use verify:catalog-sql-local for PostgreSQL execution.')
