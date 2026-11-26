import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatCairoLocalDateTime, parseCairoLocalDateTime } from '../src/lib/booking/cairo-time.ts'

const migration = readFileSync('supabase/migrations/077_atomic_cms_page_lifecycle_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/cms.ts', 'utf8')
const manager = readFileSync('src/components/admin/CmsStructureManager.tsx', 'utf8')
const adminPage = readFileSync('src/app/admin/pages/page.tsx', 'utf8')
const seoForm = readFileSync('src/components/admin/PageSeoForm.tsx', 'utf8')

assert.match(migration, /revoke insert, update, delete on table public\.pages from anon, authenticated;/, 'browser page writes must be revoked')
const fn = migration.slice(migration.indexOf('create or replace function public.manage_cms_page'), migration.indexOf('revoke all on function public.manage_cms_page'))
assert.match(fn, /has_permission\('content\.manage', p_actor_id\)/, 'page mutation must repeat content management permission')
assert.match(fn, /has_permission\('content\.publish', p_actor_id\)/, 'public or scheduled content must independently require publish permission')
assert.match(fn, /from public\.pages where id = p_page_id for update[\s\S]*pg_advisory_xact_lock/, 'page update must lock its aggregate')
assert.match(fn, /v_count >= 200/, 'unbounded page creation must be denied')
assert.match(fn, /legal_page_approval_required/, 'legal publication approval must be enforced in PostgreSQL')
assert.match(fn, /home_page_required_sections/, 'home publication readiness must be enforced in PostgreSQL')
assert.equal((fn.match(/insert into public\.content_revisions/g) ?? []).length, 2, 'SEO and full page updates must checkpoint the prior row')
assert.equal((fn.match(/insert into public\.audit_logs/g) ?? []).length, 3, 'create, SEO and full updates must audit inside the transaction')
assert.match(migration, /revoke all on function public\.manage_cms_page[\s\S]*grant execute on function public\.manage_cms_page[\s\S]*to service_role;/, 'page RPC must be service-only')

const scheduler = migration.slice(migration.lastIndexOf('create or replace function public.publish_scheduled_content'))
assert.match(scheduler, /legal_review_status <> 'approved'[\s\S]*required\(kind\)[\s\S]*page\.scheduled_published/, 'scheduler must recheck legal/home readiness and audit page publication')
assert.match(scheduler, /article\.scheduled_published/, 'scheduler must audit article publication rather than silently changing public state')

for (const action of ['updatePageSeo', 'createCmsPage', 'saveCmsPage']) {
  const start = actions.indexOf(`export async function ${action}`)
  const next = actions.indexOf('\nexport async function ', start + 1)
  const body = actions.slice(start, next === -1 ? actions.length : next)
  assert(start >= 0, `${action} must exist`)
  assert.match(body, /rpc\('manage_cms_page'/, `${action} must use the governed page transaction`)
  assert(!/from\('(pages|content_revisions|audit_logs)'\)\.(insert|update|delete)/.test(body), `${action} must not retain split page writes`)
}
const whitelist = actions.slice(actions.indexOf('const FIELD_WHITELIST'), actions.indexOf('export async function adminSetField'))
assert(!/^\s*pages:/m.test(whitelist), 'generic publish toggle must not bypass governed page readiness')
assert(actions.includes('parseCairoLocalDateTime(publishAtInput)'), 'scheduled wall time must be converted as Cairo time')
assert.equal(parseCairoLocalDateTime('2026-01-15T12:00')?.toISOString(), '2026-01-15T10:00:00.000Z', 'winter Cairo scheduling offset changed')
assert.equal(parseCairoLocalDateTime('2026-07-15T12:00')?.toISOString(), '2026-07-15T09:00:00.000Z', 'summer Cairo scheduling offset changed')
assert.equal(formatCairoLocalDateTime('2026-07-15T09:00:00.000Z'), '2026-07-15T12:00', 'stored UTC schedule must render as Cairo wall time')
assert(!adminPage.includes('<PublishToggle table="pages"'), 'Admin page must expose only the governed lifecycle editor')
assert(manager.includes('بتوقيت القاهرة') && manager.includes('pattern="https://.*"'), 'Admin editor must identify schedule timezone and mirror HTTPS constraints')
assert(seoForm.includes('maxLength={70}') && seoForm.includes('maxLength={180}') && seoForm.includes("role={msg === 'حُفظ ✓' ? 'status' : 'alert'}"), 'standalone SEO form must mirror bounds and announce durable status')

console.log('verify:cms-page-lifecycle-local passed — atomic page revision/publication/audit, Cairo scheduling and non-bypassable legal/home gates verified locally')
