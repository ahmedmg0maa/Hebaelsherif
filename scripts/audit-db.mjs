import { existsSync, readdirSync } from 'node:fs'
import { report } from './lib.mjs'

const failures = []
const dir = 'supabase/migrations'

if (existsSync(dir)) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'))
  const bad = files.filter((f) => !/^\d{3,14}_[a-z0-9_]+\.sql$/.test(f))
  for (const b of bad) failures.push(`migration not matching NNN_name.sql convention: ${b}`)
  const prefixes = files.map((f) => f.split('_')[0])
  if (new Set(prefixes).size !== prefixes.length) failures.push('duplicate migration order prefixes')
}
// Directory absent is fine until V0.3.0 — audit:launch enforces its presence at MVP gate.

report('audit:db', failures)
