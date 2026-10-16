// Guarded demo seeder: refuses to run unless SEED_DEMO=true.
// Usage: SEED_DEMO=true DATABASE_URL=postgres://... pnpm db:seed
import { execSync } from 'node:child_process'

if (process.env.SEED_DEMO !== 'true') {
  console.error('❌ db:seed refused — set SEED_DEMO=true explicitly (never in production).')
  process.exit(1)
}
const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ db:seed — DATABASE_URL is required (Supabase connection string).')
  process.exit(1)
}
if (/supabase\.co/.test(url) && process.env.SEED_ALLOW_REMOTE !== 'true') {
  console.error('❌ db:seed — remote Supabase URL detected. Set SEED_ALLOW_REMOTE=true if this is a non-production project.')
  process.exit(1)
}

execSync(`psql "${url}" -v ON_ERROR_STOP=1 -f supabase/seed.sql`, { stdio: 'inherit' })
console.log('✅ demo seed applied')
