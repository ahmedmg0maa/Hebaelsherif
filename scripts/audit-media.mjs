import { existsSync } from 'node:fs'
import { read, report } from './lib.mjs'

const failures = []
const required = [
  'supabase/migrations/021_media_library.sql',
  'supabase/migrations/046_media_governance_local_only.sql',
  'supabase/migrations/054_media_lifecycle_local_only.sql',
  'src/components/admin/MediaManager.tsx',
  'src/components/admin/MediaPickerField.tsx',
  'src/app/admin/media/page.tsx',
]
for (const file of required) if (!existsSync(file)) failures.push(`${file}: required media-library file missing`)

if (existsSync(required[0])) {
  const sql = read(required[0])
  for (const token of ['media_usages', 'visibility', 'mime_type', 'tags', 'has_permission']) {
    if (!sql.includes(token)) failures.push(`media migration missing ${token}`)
  }
}
if (existsSync(required[1])) {
  const sql = read(required[1])
  for (const token of ['rights_status', 'rights_reference', 'caption', 'credit', 'folder', 'focal_x', 'focal_y', 'processing_status']) {
    if (!sql.includes(token)) failures.push(`media governance migration missing ${token}`)
  }
}
if (existsSync(required[2])) {
  const sql = read(required[2])
  for (const token of ['archived_at', 'replaced_by', 'manage_media_asset_lifecycle', 'media.archived', 'media.restored', 'media.replaced']) {
    if (!sql.includes(token)) failures.push(`media lifecycle migration missing ${token}`)
  }
}
if (existsSync('src/lib/actions/admin-control.ts')) {
  const actions = read('src/lib/actions/admin-control.ts')
  for (const token of ['allowedMime', 'updateMediaMetadata', "rpc('manage_catalog_item'", "rpc('manage_commerce_record'", "getPublicUrl(asset.path)"]) {
    if (!actions.includes(token)) failures.push(`media actions missing ${token}`)
  }
}
for (const migration of ['086_atomic_catalog_editor_local_only.sql','087_atomic_commerce_administration_local_only.sql']) {
  const sql = read(`supabase/migrations/${migration}`)
  for (const token of ['delete from public.media_usages','insert into public.media_usages','asset.archived_at','media_assets','content_revisions','audit_logs']) if (!sql.includes(token)) failures.push(`${migration}: atomic media contract missing ${token}`)
}
for (const editor of ['ArticleEditor.tsx', 'ProductManager.tsx', 'CatalogManager.tsx']) {
  const file = `src/components/admin/${editor}`
  if (!existsSync(file) || !read(file).includes('MediaPickerField')) failures.push(`${file}: reusable media picker not integrated`)
}

report('audit:media', failures)
