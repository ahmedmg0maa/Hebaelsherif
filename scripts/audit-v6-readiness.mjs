import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const forbidden = ['Fire' + 'base', 'fire' + 'base', 'Fire' + 'store', 'fire' + 'store', 'ignore' + 'BuildErrors']
const requiredFiles = [
  'src/lib/supabase/admin.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/data-client-compat.ts',
  'src/lib/supabase/data-admin-compat.ts',
  'src/lib/auth/guards.ts',
  'src/components/layout/AdminSidebar.tsx',
  'supabase/migrations/0009_admin_os_hardening.sql',
  '.env.example',
  'ADMIN_GUIDE.md',
  'SUPABASE_SETUP.md',
  'SECURITY_REPORT.md',
  'TEST_REPORT.md',
]

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(item.name)) continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required V6 file: ${file}`)
}

const sourceFiles = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx)$/.test(file))
for (const file of sourceFiles) {
  const stat = fs.statSync(file)
  if (stat.size === 0) errors.push(`Empty source file: ${path.relative(root, file)}`)
  const text = fs.readFileSync(file, 'utf8')
  for (const phrase of forbidden) {
    if (text.includes(phrase)) errors.push(`Forbidden legacy phrase "${phrase}" in ${path.relative(root, file)}`)
  }
}

const rootFiles = ['next.config.mjs', 'tsconfig.json', 'package.json', 'vercel.json']
for (const file of rootFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  for (const phrase of forbidden) {
    if (text.includes(phrase)) errors.push(`Forbidden legacy phrase "${phrase}" in ${file}`)
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (pkg.scripts?.build !== 'node scripts/build-v6.mjs') errors.push('package.json build script must run the verified V6 Next build guard.')
if (!pkg.scripts?.check?.includes('pnpm run audit:v6')) errors.push('package.json check must include audit:v6 via pnpm.')

const adminRoutes = ['bookings', 'orders', 'users', 'analytics', 'settings', 'logs', 'messages']
for (const route of adminRoutes) {
  if (!fs.existsSync(path.join(root, `src/app/admin/${route}/page.tsx`))) errors.push(`Missing admin route: /admin/${route}`)
}

if (errors.length) {
  console.error('V6 readiness audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V6 readiness audit passed: ${sourceFiles.length} source files, ${adminRoutes.length} admin routes, native Supabase hardening files verified.`)
