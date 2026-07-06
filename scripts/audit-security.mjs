import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(item.name)) continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

// 1. Package manager discipline
if (fs.existsSync(path.join(root, 'package-lock.json'))) errors.push('package-lock.json must not exist (pnpm only).')
if (!fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) errors.push('pnpm-lock.yaml is required.')

// 2. Vercel config: pnpm + frozen lockfile + security headers
const vercel = JSON.parse(read('vercel.json'))
const installCommand = String(vercel.installCommand || '')
if (!installCommand.includes('pnpm install')) errors.push('vercel.json installCommand must use pnpm.')
if (/(^|[^p])npm (install|ci)/.test(installCommand)) errors.push('vercel.json installCommand must not use npm.')
if (!installCommand.includes('--frozen-lockfile')) errors.push('vercel.json should install with --frozen-lockfile.')

const headerBlock = JSON.stringify(vercel.headers || [])
for (const header of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!headerBlock.includes(header)) errors.push(`Security header missing from vercel.json: ${header}`)
}

// 3. Source scan: no Firebase, no service-role exposure, no ignoreBuildErrors
const sourceFiles = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx)$/.test(file))
for (const file of sourceFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  const text = fs.readFileSync(file, 'utf8')
  if (/from ['"]firebase/.test(text) || /FIREBASE_/.test(text)) errors.push(`Firebase reference in ${rel}`)
  if (/NEXT_PUBLIC[A-Z_]*SERVICE_ROLE/.test(text)) errors.push(`Service-role key exposed via NEXT_PUBLIC in ${rel}`)
}
const nextConfig = read('next.config.mjs')
if (nextConfig.includes('ignoreBuildErrors')) errors.push('ignoreBuildErrors must not be used in next.config.')

// 4. Admin seeding must be secret-gated
const seedAdmin = read('src/app/api/admin/seed-admin/route.ts')
if (!seedAdmin.includes('ADMIN_SETUP_SECRET')) errors.push('seed-admin route must be gated by ADMIN_SETUP_SECRET.')

// 5. Owner-role escalation protection
const roleRoute = read('src/app/api/admin/users/[id]/role/route.ts')
if (!roleRoute.includes("role === 'owner'")) errors.push('Owner-role protection missing in users/[id]/role route.')
const actionsRoute = read('src/app/api/admin/actions/route.ts')
if (!actionsRoute.includes('OWNER_ROLE_PROTECTED')) errors.push('Owner-role protection missing in admin actions route.')

// 6. Migration safety: known incident patterns must not return
const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'))
let rlsSql = ''
for (const file of migrations) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  rlsSql += sql
  if (/generated always as \(tstzrange/i.test(sql)) errors.push(`Non-immutable generated tstzrange column in ${file} (V6 incident #1).`)
}
if (!/create trigger trg_bookings_slot_range/i.test(rlsSql)) errors.push('Trigger-based slot_range is missing from migrations.')

// 7. RLS enabled on sensitive tables
for (const table of ['coupons', 'payment_proofs', 'bookings', 'orders', 'content_access', 'book_files', 'audit_logs', 'offers', 'workshops', 'workshop_registrations', 'workshop_access_links', 'course_enrollments', 'lesson_progress', 'refunds', 'book_download_logs']) {
  if (!rlsSql.includes(`alter table public.${table} enable row level security`)) {
    errors.push(`RLS not enabled for sensitive table: ${table}`)
  }
}

if (errors.length) {
  console.error('Security audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Security audit passed: ${sourceFiles.length} source files, ${migrations.length} migrations, headers and RLS checks verified.`)
