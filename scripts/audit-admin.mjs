import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []

const requiredAdminPages = [
  'src/app/admin/page.tsx',
  'src/app/admin/layout.tsx',
  'src/app/admin/[section]/page.tsx',
  'src/app/admin/bookings/page.tsx',
  'src/app/admin/orders/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/admin/books/page.tsx',
  'src/app/admin/courses/page.tsx',
  'src/app/admin/workshops/page.tsx',
  'src/app/admin/coupons/page.tsx',
  'src/app/admin/offers/page.tsx',
  'src/app/admin/messages/page.tsx',
  'src/app/admin/reviews/page.tsx',
  'src/app/admin/analytics/page.tsx',
  'src/app/admin/settings/page.tsx',
  'src/app/admin/logs/page.tsx',
  'src/app/admin/system-health/page.tsx',
  'src/app/admin/exports/page.tsx',
]

for (const file of requiredAdminPages) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing admin page: ${file}`)
}

const requiredAdminApis = [
  'src/app/api/admin/actions/route.ts',
  'src/app/api/admin/v7/[entity]/route.ts',
  'src/app/api/admin/v7/[entity]/[id]/route.ts',
  'src/app/api/admin/v7-workshops/[id]/registrations/route.ts',
  'src/app/api/admin/v7-workshops/[id]/links/route.ts',
]

for (const file of requiredAdminApis) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) {
    errors.push(`Missing admin API: ${file}`)
    continue
  }
  const text = fs.readFileSync(full, 'utf8')
  if (!text.includes('requireAdminSession') && !text.includes('requireAdmin')) {
    errors.push(`Admin API without server-side role check: ${file}`)
  }
}

// Audit logging must be wired into mutating V7 admin APIs.
for (const file of ['src/app/api/admin/v7/[entity]/route.ts', 'src/app/api/admin/v7/[entity]/[id]/route.ts', 'src/app/api/admin/v7-workshops/[id]/registrations/route.ts']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  if (!text.includes('writeAdminLog')) errors.push(`Admin API without audit logging: ${file}`)
}

// Admin navigation must include operational V7 sections.
const design = fs.readFileSync(path.join(root, 'src/constants/design.ts'), 'utf8')
for (const href of ['/admin/workshops', '/admin/coupons', '/admin/offers']) {
  if (!design.includes(href)) errors.push(`Admin nav missing link: ${href}`)
}

if (errors.length) {
  console.error('Admin audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Admin audit passed: ${requiredAdminPages.length} pages and ${requiredAdminApis.length} guarded APIs verified.`)
