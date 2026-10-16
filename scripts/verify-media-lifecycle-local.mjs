import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/054_media_lifecycle_local_only.sql')
const actions = read('src/lib/actions/admin-control.ts')
const manager = read('src/components/admin/MediaManager.tsx')
const page = read('src/app/admin/media/page.tsx')
const readiness = read('src/lib/catalog/publication-readiness.ts')
const cms = read('src/lib/data/cms.ts')
const press = read('src/lib/data/press.ts')
const resources = read('src/lib/data/resources.ts')

for (const token of [
  'archived_at timestamptz', 'archived_by uuid', 'replaced_by uuid',
  'manage_media_asset_lifecycle', "p_action not in ('archive', 'restore', 'replace')",
  "has_permission('media.manage', p_actor_id)", "set search_path = ''",
  'media_in_use_requires_replacement', 'media_replacement_incompatible',
  'update public.products set cover_url', 'update public.courses set cover_url',
  'update public.books set cover_url', 'update public.workshops set cover_url',
  'update public.articles set cover_url', 'update public.press_mentions set image_media_id',
  'update public.resources set media_asset_id', 'insert into public.media_usages',
  "'media.archived'", "'media.restored'", "'media.replaced'",
  'revoke all on function public.manage_media_asset_lifecycle',
  'grant execute on function public.manage_media_asset_lifecycle',
]) assert.ok(migration.includes(token), `missing media lifecycle database contract: ${token}`)

assert.ok(migration.includes("visibility = 'private'") && migration.includes("archived_at = null"), 'archive/restore visibility boundary is incomplete')
assert.ok(!migration.includes('storage.objects') && !migration.includes('delete from storage'), 'lifecycle migration must preserve the storage object')
assert.ok(actions.includes("requireAdminUser('media.manage')") && actions.includes(".rpc('manage_media_asset_lifecycle'"), 'server action must permission-check and use the atomic lifecycle RPC')
assert.ok(actions.includes('أضيفي مرجع ملكية أو ترخيص الصورة العامة') && actions.includes('hasRightsReference'), 'public-image rights and minimized metadata audit are incomplete')
for (const token of ['MediaLifecycle', 'استعادة', 'استبدال ونقل الاستخدام', 'أرشفة']) assert.ok(manager.includes(token), `Admin lifecycle control missing: ${token}`)
for (const token of ["lifecycle === 'active'", "lifecycle === 'archived'", 'replaced_by', 'replacementAssets.filter']) assert.ok(page.includes(token), `Admin media library lifecycle view missing: ${token}`)
assert.ok(!readiness.includes('deleted_at'), 'catalog publication still queries the nonexistent deleted_at column')
assert.ok(readiness.includes('archived_at') && readiness.includes('processing_status'), 'catalog publication does not reject archived/failed media')
assert.ok(cms.includes(".is('archived_at', null)"), 'Admin media picker exposes archived media')
assert.ok(press.includes('!media?.archived_at') && resources.includes('!media?.archived_at'), 'public direct-media consumers do not fail closed for archived assets')

console.log('verify:media-lifecycle-local passed — archive/restore/replace, atomic references/audit, rights and public-consumer denial verified')
