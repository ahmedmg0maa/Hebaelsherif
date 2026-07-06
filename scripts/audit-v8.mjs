import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const pkg = JSON.parse(read('package.json'))
if (pkg.version !== '8.0.0') errors.push(`package.json version must be 8.0.0 for final V8 delivery, got ${pkg.version}`)
if (pkg.packageManager !== 'pnpm@10.13.1') errors.push('packageManager must remain pnpm@10.13.1')
if (exists('package-lock.json')) errors.push('package-lock.json must not exist')
if (!exists('pnpm-lock.yaml')) errors.push('pnpm-lock.yaml is required')

const requiredFiles = [
  'src/lib/commerce/unified.ts',
  'src/components/commerce/UnifiedProductCard.tsx',
  'src/components/commerce/CommercePipeline.tsx',
  'src/app/checkout/[productType]/[slug]/page.tsx',
  'src/app/admin/products/page.tsx',
  'src/app/admin/pages/page.tsx',
  'src/app/admin/media/page.tsx',
  'src/app/admin/reports/page.tsx',
  'src/app/admin/roles/page.tsx',
  'src/app/admin/security/page.tsx',
  'src/app/admin/audit-logs/page.tsx',
  'supabase/migrations/0013_v8_unified_platform.sql',
  'docs/V8_FINAL_DELIVERY_REPORT.md',
  'docs/V7_3_0_COMMERCE_STABLE_REPORT.md',
  'docs/V7_4_0_ADMIN_OS_REPORT.md',
  'docs/V7_5_0_INTELLIGENCE_REPORT.md',
  'docs/V7_6_0_SECURITY_SSL_REPORT.md',
  'docs/V7_7_0_CMS_PAGE_CONTROLS_REPORT.md',
  'docs/V7_8_0_EDITORIAL_BRAND_REPORT.md',
  'docs/V7_9_0_PRODUCTION_HARDENING_REPORT.md',
]

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing V8 required file: ${file}`)
}

const migration = exists('supabase/migrations/0013_v8_unified_platform.sql') ? read('supabase/migrations/0013_v8_unified_platform.sql') : ''
for (const table of ['products', 'product_bundles', 'checkout_sessions', 'page_sections', 'navigation_items', 'learning_snapshots', 'offer_targets']) {
  if (!migration.includes(`create table if not exists public.${table}`)) errors.push(`Missing V8 table in 0013: ${table}`)
}
if (!migration.includes('enable row level security')) errors.push('V8 migration must enable RLS on new tables')

const design = read('src/constants/design.ts')
for (const href of ['/admin/products', '/admin/pages', '/admin/media', '/admin/reports', '/admin/roles', '/admin/security', '/admin/audit-logs']) {
  if (!design.includes(href)) errors.push(`Admin navigation missing V8 route: ${href}`)
}

const routes = [
  'src/app/checkout/[productType]/[slug]/page.tsx',
  'src/app/dashboard/courses/[slug]/learn/page.tsx',
  'src/app/admin/products/page.tsx',
]
for (const route of routes) {
  const text = exists(route) ? read(route) : ''
  if (text.includes('Visual slot') || text.includes('Brand image can be added later') || text.includes('lorem ipsum')) {
    errors.push(`Forbidden placeholder in ${route}`)
  }
}

const docs = read('docs/V8_FINAL_DELIVERY_REPORT.md')
for (const marker of ['V7.2.1', 'V7.3.0', 'V7.4.0', 'V7.5.0', 'V7.6.0', 'V7.7.0', 'V7.8.0', 'V7.9.0', 'V8.0.0']) {
  if (!docs.includes(marker)) errors.push(`V8 final report missing roadmap marker: ${marker}`)
}

if (errors.length) {
  console.error('V8 readiness audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V8 readiness audit passed: ${requiredFiles.length} files, ${7} tables, navigation, roadmap, and deployment contract verified.`)
