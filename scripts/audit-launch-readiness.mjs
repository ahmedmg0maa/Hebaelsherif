import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const requiredRoutes = [
  ['/', 'src/app/page.tsx'],
  ['/start-here', 'src/app/start-here/page.tsx'],
  ['/services', 'src/app/services/page.tsx'],
  ['/programs', 'src/app/programs/page.tsx'],
  ['/courses', 'src/app/courses/page.tsx'],
  ['/books', 'src/app/books/page.tsx'],
  ['/booking', 'src/app/booking/page.tsx'],
  ['/articles', 'src/app/articles/page.tsx'],
  ['/about', 'src/app/about/page.tsx'],
  ['/faq', 'src/app/faq/page.tsx'],
  ['/contact', 'src/app/contact/page.tsx'],
  ['/trust-safety', 'src/app/trust-safety/page.tsx'],
  ['/privacy', 'src/app/privacy/page.tsx'],
  ['/terms', 'src/app/terms/page.tsx'],
  ['/refund-policy', 'src/app/refund-policy/page.tsx'],
  ['/session-policy', 'src/app/session-policy/page.tsx'],
  ['/disclaimer', 'src/app/disclaimer/page.tsx'],
  ['/cookies', 'src/app/cookies/page.tsx'],
]

const requiredFiles = [
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/collection/route.ts',
  'src/app/api/bookings/route.ts',
  'src/app/api/coupons/validate/route.ts',
  'src/app/api/payments/proof/route.ts',
  'src/constants/booking.ts',
  'src/constants/payments.ts',
  'src/lib/utils/formatters.ts',
  'src/components/ui/ImageSlot.tsx',
  'src/components/experience/ThemeToggle.tsx',
  'src/components/experience/AiGuide.tsx',
  'firestore.rules',
  '.env.example',
]

const forbiddenInPublicSource = [
  'Visual slot',
  'Brand image can be added later',
  'مكان صورة',
  'هادئ ليلي',
  '1,200 ج.م',
  '1,500 ج.م',
]

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(item.name)) continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) walk(full, files)
    else if (/\.(tsx?|jsx?|css|mjs|json)$/.test(item.name)) files.push(full)
  }
  return files
}

const errors = []

for (const [route, file] of requiredRoutes) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing route ${route}: ${file}`)
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`)
}

const sourceFiles = walk(path.join(root, 'src'))
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const phrase of forbiddenInPublicSource) {
    if (text.includes(phrase)) errors.push(`Forbidden public phrase "${phrase}" in ${path.relative(root, file)}`)
  }
}

const booking = fs.readFileSync(path.join(root, 'src/constants/booking.ts'), 'utf8')
if (!booking.includes('start: 7')) errors.push('Booking start hour must be 7 AM.')
if (!booking.includes('end: 21')) errors.push('Booking end hour must be 9 PM.')
if (!booking.includes('maxDaysAhead: 30')) errors.push('Booking range must be 30 days.')

const formatters = fs.readFileSync(path.join(root, 'src/lib/utils/formatters.ts'), 'utf8')
if (!formatters.includes('EGP')) errors.push('formatEGP must render EGP.')
if (!formatters.includes('formatTime12h')) errors.push('12-hour time formatter is missing.')

const design = fs.readFileSync(path.join(root, 'src/constants/design.ts'), 'utf8')
for (const social of ['facebook', 'instagram', 'tiktok']) {
  if (!design.includes(`key: '${social}'`)) errors.push(`Design constants missing ${social} social link.`)
}
const footer = fs.readFileSync(path.join(root, 'src/components/layout/Footer.tsx'), 'utf8')
if (!footer.includes('SocialIcon')) errors.push('Footer missing SVG social icon renderer.')

if (errors.length) {
  console.error('Launch readiness audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Launch readiness audit passed: ${requiredRoutes.length} public routes, ${requiredFiles.length} core files, and ${sourceFiles.length} source files checked.`)
