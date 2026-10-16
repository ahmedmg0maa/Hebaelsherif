import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { actor, editor, cover, cover2, catalogPayload, catalogFixtureSQL } from './catalog-test-fixture.mjs'

// Explicit separate test-tool installation; never loads credentials or a remote DB.
if (!process.env.HEBA_TEST_PGLITE_PATH) throw new Error('Set HEBA_TEST_PGLITE_PATH to an installed @electric-sql/pglite/dist/index.js (tested: 0.5.8).')
const { PGlite } = await import(pathToFileURL(process.env.HEBA_TEST_PGLITE_PATH).href)
const db = new PGlite()
let checks = 0
const check = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`) }
const mutate = async (kind, id, action, content = {}, who = actor) => (await db.query('select public.manage_catalog_item($1,$2,$3,$4,$5::jsonb) as result', [who, kind, id, action, JSON.stringify(content)])).rows[0].result
const snapshot = async () => {
  const result = {}
  for (const table of ['products','courses','books','workshops','services','media_usages','content_revisions','audit_logs']) result[table] = (await db.query(`select to_jsonb(t) as row from ${table} t order by id`)).rows
  return result
}
const rejectsUnchanged = async (operation, pattern) => {
  const before = await snapshot()
  await assert.rejects(operation, pattern)
  assert.deepEqual(await snapshot(), before)
}
try {
  await db.exec(catalogFixtureSQL())
  await check('actual migration compiles', () => db.exec(readFileSync('supabase/migrations/086_atomic_catalog_editor_local_only.sql', 'utf8')))
  const items = {}
  for (const kind of ['course','book','workshop','service']) await check(`${kind} draft saves product/domain/two usages/audit`, async () => {
    items[kind] = await mutate(kind, null, 'save', catalogPayload(kind))
    const { rows } = await db.query('select count(*)::int as n from media_usages where entity_id=any($1)', [[items[kind].id, items[kind].productId]])
    assert.equal(rows[0].n, 2)
  })
  await check('invalid direct SQL input leaves everything unchanged', async () => {
    for (const change of [{ price: -1 }, { title: '' }, { unknown: true }, { is_published: 'true' }, { price: 1.111 }]) await rejectsUnchanged(() => mutate('book', items.book.id, 'save', { ...catalogPayload('book'), ...change }), /catalog_payload_invalid/)
  })
  await check('permission denied before writes', () => rejectsUnchanged(() => mutate('book', items.book.id, 'publication', { is_published: true }, editor), /catalog_permission_required/))
  await check('missing delivery rolls back both publication flags and revision', () => rejectsUnchanged(() => mutate('book', items.book.id, 'publication', { is_published: true }), /catalog_book_incomplete/))
  await db.query('insert into book_files(book_id,storage_path) values($1,$2)', [items.book.id, 'synthetic/book.pdf'])
  await check('unverified rights deny complete book publication', async () => {
    await db.query("update media_assets set rights_status='unverified' where id=$1", [cover])
    await rejectsUnchanged(() => mutate('book', items.book.id, 'publication', { is_published: true }), /catalog_media_rights_required/)
    await db.query("update media_assets set rights_status='owned' where id=$1", [cover])
  })
  await check('complete book publishes both flags in one transaction', async () => {
    await mutate('book', items.book.id, 'publication', { is_published: true })
    const { rows } = await db.query('select b.is_published as domain,p.is_published as product from books b join products p on p.id=b.product_id where b.id=$1', [items.book.id])
    assert.deepEqual(rows[0], { domain: true, product: true })
  })
  await check('manage-only role cannot change a published item', () => rejectsUnchanged(() => mutate('book', items.book.id, 'save', catalogPayload('book'), editor), /catalog_publish_required/))
  await check('other kinds reject incomplete publication', async () => {
    for (const kind of ['course','service']) await rejectsUnchanged(() => mutate(kind, items[kind].id, 'publication', { is_published: true }), new RegExp(`catalog_${kind}_incomplete`))
    await rejectsUnchanged(() => mutate('workshop', items.workshop.id, 'save', catalogPayload('workshop', { is_published: 'on', meeting_url: '' })), /catalog_workshop_incomplete/)
  })
  await check('course workshop and service publish when complete', async () => {
    const moduleId = (await db.query('insert into course_modules(course_id,title) values($1,$2) returning id', [items.course.id, 'Synthetic module'])).rows[0].id
    await db.query('insert into course_lessons(module_id,title,description) values($1,$2,$3)', [moduleId, 'Synthetic lesson', 'Sufficient synthetic lesson content for readiness.'])
    await db.query("insert into availability_rules(service_id,weekday,start_time,end_time) values($1,1,'10:00','14:00')", [items.service.id])
    for (const kind of ['course','workshop','service']) {
      await mutate(kind, items[kind].id, 'publication', { is_published: true })
      assert.equal((await db.query('select is_published from products where id=$1', [items[kind].productId])).rows[0].is_published, true)
    }
  })
  await check('unchanged cover keeps managed usage on edit', async () => {
    await mutate('book', items.book.id, 'save', catalogPayload('book', { cover_asset_id: '', is_published: 'on', title: 'عنوان منقّح' }))
    const { rows } = await db.query("select asset_id from media_usages where entity_type='book' and entity_id=$1", [items.book.id])
    assert.equal(rows[0].asset_id, cover)
  })
  await check('duplicate slug cannot leave an orphan product', () => rejectsUnchanged(() => mutate('course', null, 'save', catalogPayload('course', { slug: 'test-book' })), /duplicate key/))
  await check('protected book delivery prevents cascade deletion', () => rejectsUnchanged(() => mutate('book', items.book.id, 'delete'), /catalog_delivery_or_bundle_exists/))
  await check('reserved seats deny destructive capacity change', async () => {
    await db.query('update workshops set seats_reserved=4 where id=$1', [items.workshop.id])
    await rejectsUnchanged(() => mutate('workshop', items.workshop.id, 'save', catalogPayload('workshop', { seats_total: '3', title: 'تغيير مرفوض' })), /catalog_capacity_below_reserved/)
  })
  await check('history-denied deletion preserves media and revisions', async () => {
    await db.query('insert into order_items(product_id) values($1)', [items.book.productId])
    await rejectsUnchanged(() => mutate('book', items.book.id, 'delete'), /catalog_history_exists/)
  })
  await db.exec("create function fixture_fail_audit() returns trigger language plpgsql as $$ begin raise exception 'synthetic_audit_failure'; end $$; create trigger fixture_audit before insert on audit_logs for each row execute function fixture_fail_audit();")
  await check('audit failure rolls back update, new cover and revision', () => rejectsUnchanged(() => mutate('book', items.book.id, 'save', catalogPayload('book', { title: 'عنوان بديل', cover_asset_id: cover2, cover_url: 'https://example.test/cover-2.jpg' })), /synthetic_audit_failure/))
  await check('audit failure rolls back complete draft creation', () => rejectsUnchanged(() => mutate('book', null, 'save', catalogPayload('book', { slug: 'audit-failed-create' })), /synthetic_audit_failure/))
  await check('audit failure rolls back deletion and media removal', () => rejectsUnchanged(() => mutate('course', items.course.id, 'delete'), /synthetic_audit_failure/))
  await db.exec('drop trigger fixture_audit on audit_logs;')
  await check('successful deletion removes domain/product/media and retains revision/audit', async () => {
    const before = (await db.query('select id from content_revisions where entity_id=$1', [items.course.id])).rows.length
    await mutate('course', items.course.id, 'delete')
    assert.equal((await db.query('select id from courses where id=$1', [items.course.id])).rows.length, 0)
    assert.equal((await db.query('select id from media_usages where entity_id=any($1)', [[items.course.id, items.course.productId]])).rows.length, 0)
    assert.equal((await db.query('select id from content_revisions where entity_id=$1', [items.course.id])).rows.length, before + 1)
  })
  await check('browser roles denied RPC execution and direct writes', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role};`)
      try {
        await assert.rejects(() => mutate('book', items.book.id, 'delete'), /permission denied/)
        await assert.rejects(() => db.query('update products set price=0 where id=$1', [items.book.productId]), /permission denied/)
      } finally { await db.exec('reset role;') }
    }
  })
  console.log(`Catalog SQL: ${checks} groups passed on local PostgreSQL/WASM. Synthetic permissions/history; no Supabase/Auth/RLS/provider or multi-session acceptance.`)
} catch (error) {
  console.error('Catalog SQL failed:', error.message, error.code ?? '', error.where ?? '')
  process.exitCode = 1
} finally { await db.close() }
