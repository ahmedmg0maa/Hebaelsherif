import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { report } from './lib.mjs'

const manifest = JSON.parse(readFileSync('scripts/expected-routes.json', 'utf8'))
const routes = [...manifest.public, ...manifest.customer, ...manifest.admin, ...manifest.checkout]
const failures = []

for (const route of routes) {
  // dynamic segments in the manifest are written exactly as the folder name, e.g. /books/[slug]
  const rel = route === '/' ? 'page.tsx' : `${route.slice(1)}/page.tsx`
  // route groups: allow a match anywhere under src/app by direct path first
  const direct = join('src/app', rel)
  if (existsSync(direct)) continue
  // search within route groups (one level deep is enough for our layout shells)
  const groups = ['(public)', '(auth)', 'dashboard', 'admin', 'checkout']
  const found = groups.some((g) => existsSync(join('src/app', g, rel)))
  if (!found) failures.push(`missing page for route ${route}`)
}

report('audit:routes', failures)
