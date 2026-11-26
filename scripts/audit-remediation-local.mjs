import { existsSync, readFileSync } from 'node:fs'

const failures = []
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : ''
const required = [
  'docs/ROAD_TO_100_REMEDIATION_EXECUTION_2026-08-25.md',
  'docs/STAGING_BOOKING_CHANGE_RUNBOOK_2026-08-25.md',
  'docs/FINAL_INDEPENDENT_ACCEPTANCE_AUDIT_AND_SCORE_POST_REMEDIATION_2026-08-25.md',
  'scripts/verify-booking-staging-contract.mjs',
]
for (const path of required) if (!existsSync(path)) failures.push(`missing remediation artifact: ${path}`)

const sitemap = read('src/app/sitemap.ts')
for (const route of ['/privacy', '/terms', '/refund', '/disclaimer', '/session-policy']) {
  if (sitemap.includes(`'${route}'`)) failures.push(`draft legal route remains indexable in sitemap: ${route}`)
}

for (const path of [
  'src/app/(public)/privacy/page.tsx',
  'src/app/(public)/terms/page.tsx',
  'src/app/(public)/refund/page.tsx',
  'src/app/(public)/disclaimer/page.tsx',
  'src/app/(public)/session-policy/page.tsx',
]) {
  if (!read(path).includes("robots: { index: false, follow: false }")) failures.push(`draft legal route lacks noindex metadata: ${path}`)
}

const globals = read('src/app/globals.css')
for (const token of ['-webkit-text-size-adjust: 100%', 'text-size-adjust: 100%', 'background-attachment: scroll']) {
  if (!globals.includes(token)) failures.push(`mobile resilience CSS missing ${token}`)
}
if (!read('src/app/layout.tsx').includes("interactiveWidget: \"resizes-content\"")) failures.push('viewport does not request resizes-content for mobile keyboards')
if (!read('tests/e2e/public.spec.ts').includes('tablet and phone layouts preserve content')) failures.push('tablet/phone regression coverage missing')

if (failures.length) {
  console.error(`audit:remediation-local failed\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('audit:remediation-local passed — staging contract, draft legal indexing guard, and mobile resilience regressions are present')
