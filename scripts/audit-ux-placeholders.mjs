import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const forbiddenPhrases = [
  'Visual slot',
  'Brand image can be added later',
  'Image only',
  'image placeholder',
  'placeholder text',
  'TODO: replace',
]
const forbiddenPublicArabic = [
  'مساحة بصرية من هوية',
  'تكوين بصري من هوية',
  'مساحة الصورة',
]
const allowedFiles = new Set([
  'docs/V6_INCIDENTS_AND_RECOVERY_PLAN.md',
])
const requiredPublicRoutes = [
  ['/', 'src/app/page.tsx'],
  ['/services', 'src/app/services/page.tsx'],
  ['/booking', 'src/app/booking/page.tsx'],
  ['/books', 'src/app/books/page.tsx'],
  ['/articles', 'src/app/articles/page.tsx'],
  ['/about', 'src/app/about/page.tsx'],
  ['/contact', 'src/app/contact/page.tsx'],
  ['/dashboard', 'src/app/dashboard/page.tsx'],
  ['/404', 'src/app/not-found.tsx'],
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

for (const [route, file] of requiredPublicRoutes) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing recovery route ${route}: ${file}`)
}

const files = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx|css)$/.test(file))
for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  const text = fs.readFileSync(file, 'utf8')
  for (const phrase of forbiddenPhrases) {
    if (text.includes(phrase)) errors.push(`Forbidden UX placeholder "${phrase}" in ${rel}`)
  }
  if (!allowedFiles.has(rel)) {
    for (const phrase of forbiddenPublicArabic) {
      if (text.includes(phrase)) errors.push(`Public placeholder copy "${phrase}" in ${rel}`)
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (pkg.packageManager !== 'pnpm@10.13.1') errors.push('packageManager must be pnpm@10.13.1 at package.json root.')
if (fs.existsSync(path.join(root, 'package-lock.json'))) errors.push('package-lock.json must be removed when deploying with pnpm.')
if (!fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) errors.push('pnpm-lock.yaml is required for Vercel pnpm deployment.')

if (errors.length) {
  console.error('UX recovery audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`UX recovery audit passed: ${files.length} source files scanned; no public placeholders or blank recovery gaps found.`)
