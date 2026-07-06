import fs from 'node:fs'
import path from 'node:path'

const routes = [
  ['/', 'src/app/page.tsx'],
  ['/about', 'src/app/about/page.tsx'],
  ['/start-here', 'src/app/start-here/page.tsx'],
  ['/services', 'src/app/services/page.tsx'],
  ['/booking', 'src/app/booking/page.tsx'],
  ['/books', 'src/app/books/page.tsx'],
  ['/courses', 'src/app/courses/page.tsx'],
  ['/workshops', 'src/app/workshops/page.tsx'],
  ['/articles', 'src/app/articles/page.tsx'],
  ['/contact', 'src/app/contact/page.tsx'],
  ['/faq', 'src/app/faq/page.tsx'],
  ['/privacy', 'src/app/privacy/page.tsx'],
  ['/terms', 'src/app/terms/page.tsx'],
  ['/refund', 'src/app/refund/page.tsx'],
  ['/disclaimer', 'src/app/disclaimer/page.tsx'],
  ['/auth/login', 'src/app/auth/login/page.tsx'],
  ['/auth/register', 'src/app/auth/register/page.tsx'],
  ['/dashboard', 'src/app/dashboard/page.tsx'],
  ['/dashboard/courses', 'src/app/dashboard/courses/page.tsx'],
  ['/dashboard/courses/[slug]/learn', 'src/app/dashboard/courses/[slug]/learn/page.tsx'],
  ['/checkout/[productType]/[slug]', 'src/app/checkout/[productType]/[slug]/page.tsx'],
  ['/admin', 'src/app/admin/page.tsx'],
  ['/not-found', 'src/app/not-found.tsx'],
]


const missing = routes.filter(([, file]) => !fs.existsSync(path.resolve(file)))

if (missing.length > 0) {
  console.error('Missing public route files:')
  missing.forEach(([route, file]) => console.error(`- ${route}: ${file}`))
  process.exit(1)
}

console.log(`Public route audit passed: ${routes.length} required public routes are present.`)
