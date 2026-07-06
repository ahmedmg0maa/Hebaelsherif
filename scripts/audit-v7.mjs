import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []

const requiredFiles = [
  // Migrations
  'supabase/migrations/0010_v7_roles.sql',
  'supabase/migrations/0011_v7_platform_foundation.sql',
  'supabase/migrations/0012_v7_storage.sql',
  // Feature flags
  'src/lib/flags.ts',
  // Workshops (public + API + component)
  'src/app/workshops/page.tsx',
  'src/app/workshops/[slug]/page.tsx',
  'src/app/api/workshops/register/route.ts',
  'src/components/workshops/WorkshopRegisterButton.tsx',
  // Offers / countdown
  'src/app/api/offers/active/route.ts',
  'src/components/offers/OfferBanner.tsx',
  'src/components/offers/CountdownTimer.tsx',
  // Refund alias route
  'src/app/refund/page.tsx',
  // V7 admin
  'src/lib/admin/v7-entities.ts',
  'src/app/admin/workshops/page.tsx',
  'src/app/admin/coupons/page.tsx',
  'src/app/admin/offers/page.tsx',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing V7 file: ${file}`)
}

const foundation = fs.readFileSync(path.join(root, 'supabase/migrations/0011_v7_platform_foundation.sql'), 'utf8')

// Feature flags seed
if (!foundation.includes("'features'")) errors.push('site_settings features seed missing from 0011.')

// LMS + workshops + offers tables
for (const table of ['course_modules', 'lesson_resources', 'course_enrollments', 'lesson_progress', 'course_notes', 'certificates', 'workshops', 'workshop_registrations', 'workshop_attendance', 'workshop_resources', 'workshop_access_links', 'offers', 'book_download_logs', 'refunds']) {
  if (!foundation.includes(`create table if not exists public.${table}`)) errors.push(`Missing V7 table in 0011: ${table}`)
}

// Capacity-safe registration RPC
if (!foundation.includes('register_workshop_with_lock')) errors.push('register_workshop_with_lock RPC missing from 0011.')
if (!foundation.includes('pg_advisory_xact_lock')) errors.push('Workshop registration must use an advisory lock.')

// Storage buckets
const storage = fs.readFileSync(path.join(root, 'supabase/migrations/0012_v7_storage.sql'), 'utf8')
for (const bucket of ['course-videos', 'course-resources', 'workshop-recordings']) {
  if (!storage.includes(bucket)) errors.push(`Missing V7 storage bucket: ${bucket}`)
}

// Enum comparisons in views must stay ::text (incident #3)
const adminOs = fs.readFileSync(path.join(root, 'supabase/migrations/0009_admin_os_hardening.sql'), 'utf8')
if (!adminOs.includes('payment_status::text')) errors.push('0009 revenue view must compare enum columns as ::text.')

// Courses stay gated until enabled
const flags = fs.readFileSync(path.join(root, 'src/lib/flags.ts'), 'utf8')
if (!flags.includes('courses_enabled: false')) errors.push('courses_enabled default must be false in flags lib.')
if (!flags.includes('workshops_enabled: false')) errors.push('workshops_enabled default must be false in flags lib.')

// V7 docs
for (const doc of ['VERCEL_DEPLOYMENT.md', 'SUPABASE_MIGRATIONS.md', 'CUSTOMER_GUIDE.md', 'V7_IMPLEMENTATION_REPORT.md', 'V7_FINAL_DELIVERY_REPORT.md', 'docs/V7_ARCHITECTURE.md', 'docs/V7_ADMIN_OS.md', 'docs/V7_DATABASE_SCHEMA.md', 'docs/V7_INCIDENTS_AND_FIXES.md', 'docs/V7_COLOR_SYSTEM.md', 'docs/V7_VISUAL_TARGETS.md', 'docs/V7_PATCH_ROADMAP_TO_V8.md']) {
  if (!fs.existsSync(path.join(root, doc))) errors.push(`Missing V7 documentation: ${doc}`)
}

if (errors.length) {
  console.error('V7 readiness audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V7 readiness audit passed: ${requiredFiles.length} platform files, migrations, RPC, storage, and docs verified.`)
