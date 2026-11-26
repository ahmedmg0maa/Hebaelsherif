import { RELEASE_ZIP_NAME } from './release-info.mjs'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { walk, read, report } from './lib.mjs'
import { inspectArchive, isArchiveName } from './archive-security.mjs'

const failures = []
const forbiddenTracked = [
  /(^|\/)\.env(?:\..+)?$/,
  /(^|\/)supabase\/\.temp(?:\/|$)/,
  /(^|\/)\.pnpm-store(?:\/|$)/,
  /(^|\/)debug\.log$/,
  /(^|\/)(?:reports|exports)\/private(?:\/|$)/,
  /\.pem$/i,
]
const secretPatterns = [
  { name: 'Supabase secret key', regex: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: 'service-role JWT', regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{20,}/ },
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
]
const textExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.sql', '.yml', '.yaml', '.toml', '.txt', '.example'])

function isTextCandidate(file) {
  const dot = file.lastIndexOf('.')
  return dot === -1 || textExtensions.has(file.slice(dot).toLowerCase())
}

function scanSecretLikeValues(file, source) {
  if (file === '.env.example') return
  for (const pattern of secretPatterns) {
    if (pattern.regex.test(source)) failures.push(`${file}: contains a ${pattern.name}`)
  }
}

// Client bundles must never reference the service-role credential.
for (const file of walk('src', ['.tsx', '.ts'])) {
  const source = read(file)
  if (/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/.test(source)) failures.push(`${file}: service role key exposed as NEXT_PUBLIC`)
  if (/(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)/.test(source) && /['\"]use client['\"]/.test(source)) {
    failures.push(`${file}: service role key referenced in a client component`)
  }
  if (/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/.test(source)) {
    failures.push(`${file}: hardcoded JWT-like value`)
  }
}

let tracked = []
try {
  tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
} catch {
  // Delivered source archives intentionally contain no .git directory. Scan the
  // release-relevant tree instead of weakening or skipping the audit.
  tracked = ['src','scripts','supabase','docs','tests'].flatMap((root) => walk(root))
  tracked.push(...['package.json','pnpm-lock.yaml','.env.example','.gitignore','README.md','AGENTS.md','DO_NOT_ZIP_WORKSPACE.txt'].filter(existsSync))
  // Archives have no Git index, so explicitly include local-only root names
  // that a naive copy operation might otherwise hide from this audit.
  tracked.push(...readdirSync('.').filter((name) => name === '.env' || (name.startsWith('.env.') && name !== '.env.example')))
  if (existsSync('supabase/.temp')) tracked.push(...walk('supabase/.temp'))
}

for (const file of tracked) {
  const normalized = file.replaceAll('\\', '/')
  if (normalized !== '.env.example' && forbiddenTracked.some((pattern) => pattern.test(normalized))) {
    failures.push(`git tracks sensitive/local-only path: ${normalized}`)
  }
  if (normalized === 'package-lock.json') failures.push('package-lock.json is tracked — pnpm only')
  if (!existsSync(file) || !isTextCandidate(normalized) || statSync(file).size > 2_000_000) continue
  scanSecretLikeValues(normalized, readFileSync(file, 'utf8'))
}

for (const file of [...walk('src', ['.ts','.tsx']), ...walk('scripts', ['.mjs','.js'])]) {
  const normalized = file.replaceAll('\\','/')
  if (normalized.endsWith('src/lib/supabase/public-key.ts') || normalized.endsWith('scripts/public-config.mjs')) continue
  if (/NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY/.test(readFileSync(file,'utf8'))) {
    failures.push(`${normalized}: bypasses the unified Supabase public-config helper`)
  }
}

if (!existsSync('.env.example')) failures.push('.env.example missing')
if (!existsSync('.gitignore')) failures.push('.gitignore missing')
else {
  const ignore = readFileSync('.gitignore', 'utf8')
  if (!/supabase\/\.temp/.test(ignore)) failures.push('.gitignore must exclude supabase/.temp')
  if (!/^\/release\/$/m.test(ignore)) failures.push('.gitignore must exclude release output')
  if (!/^\/\.pnpm-store\/$/m.test(ignore)) failures.push('.gitignore must exclude .pnpm-store')
  if (!/^\/debug\.log$/m.test(ignore)) failures.push('.gitignore must exclude debug.log')
}

// If a release package has been generated, verify both its manifest and staging tree.
const manifestPath = 'release/manifest.json'
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    for (const file of manifest.files ?? []) {
      const normalized = String(file).replaceAll('\\', '/')
      if (normalized !== '.env.example' && forbiddenTracked.some((pattern) => pattern.test(normalized))) {
        failures.push(`release contains forbidden path: ${normalized}`)
      }
      if (isArchiveName(normalized)) {
        const stagedArchive = join('release', 'source', normalized)
        if (!existsSync(stagedArchive)) failures.push(`release manifest archive is missing from staging: ${normalized}`)
        else failures.push(...inspectArchive(stagedArchive, `release/source/${normalized}`))
      }
    }
    const releaseArchive = 'release/hebaelsherif-source.tgz'
    if (!existsSync(releaseArchive)) failures.push('release archive is missing')
    else failures.push(...inspectArchive(releaseArchive, releaseArchive))
    const releaseZip = `release/${RELEASE_ZIP_NAME}`
    if (!existsSync(releaseZip)) failures.push('release ZIP is missing')
    else failures.push(...inspectArchive(releaseZip, releaseZip))
  } catch {
    failures.push('release/manifest.json is invalid')
  }
}

report('audit:security', [...new Set(failures)])
