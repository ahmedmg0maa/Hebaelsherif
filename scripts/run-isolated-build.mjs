import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'

const root = process.cwd()
const tempRoot = mkdtempSync(join(tmpdir(), 'heba-isolated-build-'))
const buildRoot = join(tempRoot, 'app')
const outputRoot = join(root, '.next')
const buildEnvArgument = process.argv.find((argument) => argument.startsWith('--env='))
const isolatedBuildEnvironment = buildEnvArgument?.slice('--env='.length) ?? ''
if (isolatedBuildEnvironment && isolatedBuildEnvironment !== 'preview') {
  throw new Error('Only the isolated provider-free Preview build is supported by this script.')
}
const excludedRoots = new Set([
  '.git', '.next', 'dist', '.vinext', '.wrangler', '.launch-backups', '.launch-tools', '.namecheap-standalone',
  'node_modules', '.pnpm-store', 'release', 'coverage', 'playwright-report', 'test-results', 'reports', 'exports',
])

function excludeFromBuild(source) {
  const rel = relative(root, source).replaceAll('\\', '/')
  if (!rel) return false
  const [top] = rel.split('/')
  const name = basename(source)
  return excludedRoots.has(top)
    || name === '.env'
    || name.startsWith('.env.')
    || /\.(?:zip|tar|tgz|tar\.gz|7z|rar|gz|dump|backup|bak|bkp)$/i.test(name)
}

// Empty, explicitly present values win over ambient process variables. The
// harmless localhost origin is required because Next validates metadataBase as
// a URL during static collection.
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
  HEBA_DEPLOYMENT_ENV: isolatedBuildEnvironment,
  STAGING_ACCESS_USER: '',
  STAGING_ACCESS_PASSWORD: '',
}
const pnpmCli = process.env.npm_execpath
if (!pnpmCli) throw new Error('pnpm CLI path is unavailable')

function runPnpm(args) {
  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd: buildRoot,
    env: { ...process.env, ...blocked },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`isolated pnpm ${args[0]} failed with exit code ${result.status ?? 'unknown'}`)
}

try {
  // A release build must not inherit or load a local environment file. Build a
  // disposable source mirror that excludes every .env* path, then create a
  // fresh offline pnpm graph inside that mirror. The copy never contains a
  // credential file, and the temporary graph is always removed in finally.
  cpSync(root, buildRoot, { recursive: true, filter: (source) => !excludeFromBuild(source) })
  // Prefer the local pnpm store but allow a lockfile-pinned package retrieval
  // if this workstation does not retain every tarball. It never writes the
  // source checkout or loads an environment file.
  runPnpm(['install', '--prefer-offline', '--frozen-lockfile', '--ignore-scripts'])
  runPnpm(['exec', 'next', 'build'])

  rmSync(outputRoot, { recursive: true, force: true })
  cpSync(join(buildRoot, '.next'), outputRoot, { recursive: true })
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
