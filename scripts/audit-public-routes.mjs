import fs from 'node:fs'
import path from 'node:path'

const routes = [
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

const missing = routes.filter(([, file]) => !fs.existsSync(path.resolve(file)))

if (missing.length > 0) {
  console.error('Missing public route files:')
  missing.forEach(([route, file]) => console.error(`- ${route}: ${file}`))
  process.exit(1)
}

console.log(`Public route audit passed: ${routes.length} required public routes are present.`)
