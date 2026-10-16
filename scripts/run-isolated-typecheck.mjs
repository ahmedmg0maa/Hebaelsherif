import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'

const root = process.cwd()
const tempRoot = mkdtempSync(join(tmpdir(), 'heba-isolated-typecheck-'))
const checkRoot = join(tempRoot, 'app')
const excludedRoots = new Set([
  '.git', '.next', 'dist', '.vinext', '.wrangler', '.launch-backups', '.launch-tools', '.namecheap-standalone',
  'node_modules', '.pnpm-store', 'release', 'coverage', 'playwright-report', 'test-results', 'reports', 'exports',
])

function excludeFromCheck(source) {
  const rel = relative(root, source).replaceAll('\\', '/')
  if (!rel) return false
  const [top] = rel.split('/')
  const name = basename(source)
  return excludedRoots.has(top)
    || name === '.env'
    || name.startsWith('.env.')
    || /\.(?:zip|tar|tgz|tar\.gz|7z|rar|gz|dump|backup|bak|bkp)$/i.test(name)
}

const pnpmCli = process.env.npm_execpath
if (!pnpmCli) throw new Error('pnpm CLI path is unavailable')
const blocked = {
  ...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map((name) => [name, ''])),
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  SUPABASE_SECRET_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
  SENTRY_ENVIRONMENT: '',
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: '',
  SENTRY_RELEASE: '',
  NEXT_PUBLIC_SENTRY_RELEASE: '',
  SENTRY_AUTH_TOKEN: '',
  PROTECTED_UPLOAD_SCAN_URL: '',
  PROTECTED_UPLOAD_SCAN_TOKEN: '',
  HEBA_DEPLOYMENT_ENV: '',
  STAGING_ACCESS_USER: '',
  STAGING_ACCESS_PASSWORD: '',
}

function runPnpm(args) {
  const result = spawnSync(process.execPath, [pnpmCli, ...args], { cwd: checkRoot, env: { ...process.env, ...blocked }, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`isolated pnpm ${args[0]} failed with exit code ${result.status ?? 'unknown'}`)
}

try {
  // Keep Next's generated route types coherent without consuming a stale
  // .next tree left by a different runtime adapter, and without ever copying
  // an environment file into the checker.
  cpSync(root, checkRoot, { recursive: true, filter: (source) => !excludeFromCheck(source) })
  runPnpm(['install', '--prefer-offline', '--frozen-lockfile', '--ignore-scripts'])
  runPnpm(['exec', 'next', 'typegen'])
  runPnpm(['exec', 'tsc', '--noEmit'])
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
