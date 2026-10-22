import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'

const root = process.cwd()
const tempRoot = mkdtempSync(join(tmpdir(), 'heba-cloudflare-isolated-build-'))
const buildRoot = join(tempRoot, 'app')
const outputRoot = join(root, 'dist')
const buildEnvArgument = process.argv.find((argument) => argument.startsWith('--env='))
const cloudflareBuildEnvironment = buildEnvArgument?.slice('--env='.length) ?? ''

if (cloudflareBuildEnvironment && !['preview', 'staging'].includes(cloudflareBuildEnvironment)) {
  throw new Error('Only isolated Preview or Staging Worker builds are supported by this script.')
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

// The Spike must prove the Workers build without reading an ambient local
// environment file. A temporary source mirror excludes every .env* file and
// shadows all known public/server configuration values with inert placeholders.
const blocked = {
  ...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map((name) => [name, ''])),
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3102',
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
  HEBA_DEPLOYMENT_ENV: cloudflareBuildEnvironment,
  STAGING_ACCESS_USER: '',
  STAGING_ACCESS_PASSWORD: '',
}
const pnpmCli = process.env.npm_execpath
if (!pnpmCli) throw new Error('pnpm CLI path is unavailable')

function runPnpm(args) {
  const result = spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd: buildRoot,
    // The Cloudflare Vite plugin consumes this value while producing its
    // generated Wrangler config. It is intentionally an explicit argument,
    // never an ambient environment value or a value from an .env file.
    env: { ...process.env, ...blocked, CLOUDFLARE_ENV: cloudflareBuildEnvironment === 'staging' ? 'staging' : '' },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`isolated pnpm ${args[0]} failed with exit code ${result.status ?? 'unknown'}`)
}

try {
  cpSync(root, buildRoot, { recursive: true, filter: (source) => !excludeFromBuild(source) })
  runPnpm(['install', '--prefer-offline', '--frozen-lockfile'])
  runPnpm(['build:vinext'])

  rmSync(outputRoot, { recursive: true, force: true })
  cpSync(join(buildRoot, 'dist'), outputRoot, { recursive: true })
  console.log('Cloudflare isolated Workers output prepared: dist/')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
