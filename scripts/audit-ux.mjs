import { walk, read, report } from './lib.mjs'

// Fails on placeholder/lazy UI markers. Allowed: premium waitlist states,
// professional empty states (<EmptyState/>), feature-flagged disabled pages.
const forbidden = [
  // "placeholder" as content/naming is forbidden; the input attribute (placeholder=),
  // Tailwind variant (placeholder:), and CSS ::placeholder / :placeholder-shown are legitimate.
  /(?<!::)placeholder(?![:=‐-]|-shown)/i,
  /\bTODO\b/,
  /lorem ipsum/i,
  /قريبًا\.{0,3}<\/(div|p|span)>/, // bare "coming soon" text blocks
  /coming soon/i,
]

const allowFile = /EmptyState|Waitlist/
const files = walk('src', ['.tsx', '.ts', '.css'])
const failures = []

for (const f of files) {
  const src = read(f)
  for (const rx of forbidden) {
    const m = src.match(rx)
    if (m && !(allowFile.test(f) && /placeholder/i.test(m[0]))) {
      failures.push(`${f}: forbidden marker "${m[0]}"`)
    }
  }
}

report('audit:ux', failures)
