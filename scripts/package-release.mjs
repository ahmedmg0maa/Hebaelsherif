import { RELEASE_ID, RELEASE_ZIP_NAME } from './release-info.mjs'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { inspectArchive, isArchiveName, isDumpName } from './archive-security.mjs'

const root = process.cwd()
const releaseRoot = join(root, 'release')
let stageRoot
const archive = join(releaseRoot, 'hebaelsherif-source.tgz')
const zipArchive = join(releaseRoot, RELEASE_ZIP_NAME)

const excludedRoots = new Set([
  '.git', '.next', 'node_modules', '.pnpm-store', 'release', 'coverage',
  'playwright-report', 'test-results', 'reports', 'exports', '.launch-backups', '.launch-tools', '.namecheap-standalone', 'dist', '.vinext', '.wrangler',
])
const excludedNames = new Set(['.DS_Store', 'tsconfig.tsbuildinfo', 'debug.log'])

function excluded(relativePath, isDirectory) {
  const normalized = relativePath.replaceAll('\\', '/')
  const [top] = normalized.split('/')
  const name = normalized.split('/').at(-1)
  // Imported checkpoints may contain an old generated manifest. It is never
  // payload: hashing it and then overwriting it breaks archive integrity.
  if (normalized === 'RELEASE_MANIFEST.json') return true
  if (excludedRoots.has(top) || excludedNames.has(name)) return true
  // Historical screenshot/video QA stays in the working source, not releases.
  if (normalized === 'docs/evidence' || normalized.startsWith('docs/evidence/')) return true
  if (normalized === 'supabase/.temp' || normalized.startsWith('supabase/.temp/')) return true
  if (name === '.env.example') return false
  if (name === '.env' || name?.startsWith('.env.')) return true
  if (/\.(?:pem|key|p12|pfx)$/i.test(name ?? '')) return true
  // Source releases never carry old release archives or database dumps. The
  // generated archive is inspected recursively after creation as a second gate.
  if (!isDirectory && (isArchiveName(normalized) || isDumpName(normalized))) return true
  if (isDirectory && /(?:^|\/)\.cache$/.test(normalized)) return true
  return false
}

function copyTree(sourceDir) {
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name)
    const rel = relative(root, source)
    if (excluded(rel, entry.isDirectory())) continue
    const destination = join(stageRoot, rel)
    if (entry.isDirectory()) {
      mkdirSync(destination, { recursive: true })
      copyTree(source)
    } else if (entry.isFile()) {
      mkdirSync(join(destination, '..'), { recursive: true })
      cpSync(source, destination)
    }
  }
}

function listFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) listFiles(absolute, files)
    else files.push(relative(stageRoot, absolute).replaceAll('\\', '/'))
  }
  return files
}

rmSync(releaseRoot, { recursive: true, force: true })
mkdirSync(releaseRoot, { recursive: true })
// A fresh path prevents old generated manifests from a prior staging tree
// being reattached through delayed filesystem metadata after recreation.
stageRoot = mkdtempSync(join(releaseRoot, 'source-'))
copyTree(root)

const files = listFiles(stageRoot).sort()
const fileIntegrity = files.map((file) => {
  const absolute = join(stageRoot, file)
  return {
    path: file,
    bytes: statSync(absolute).size,
    sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex'),
  }
})
const forbidden = files.filter((file) => /(^|\/)\.env(?:\..+)?$/.test(file) && file !== '.env.example'
  || file.startsWith('supabase/.temp/')
  || file.startsWith('docs/evidence/')
  || /^(?:\.next|node_modules|\.pnpm-store|playwright-report|test-results|reports|exports)(?:\/|$)/.test(file)
  || file === 'debug.log')
if (forbidden.length) throw new Error(`Forbidden release paths: ${forbidden.join(', ')}`)

const risky = files.filter((file) => {
  const absolute = join(stageRoot, file)
  if (statSync(absolute).size > 2_000_000 || /\.(?:png|jpe?g|webp|gif|ico|woff2?|zip|tgz|pdf)$/i.test(file)) return false
  const source = readFileSync(absolute, 'utf8')
  return /sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)
})
if (risky.length) throw new Error(`Secret-looking values found in release: ${risky.join(', ')}`)

mkdirSync(releaseRoot, { recursive: true })
const manifestJson = `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  release: RELEASE_ID,
  fileCount: files.length,
  integrityScope: 'Every payload file; RELEASE_MANIFEST.json excludes itself by design.',
  files,
  fileIntegrity,
}, null, 2)}\n`
writeFileSync(join(stageRoot, 'RELEASE_MANIFEST.json'), manifestJson)
const manifestTemporary = join(stageRoot, 'manifest.tmp')
writeFileSync(manifestTemporary, manifestJson)
renameSync(manifestTemporary, join(releaseRoot, 'manifest.json'))
// Archive the exact manifest inventory. Recursive directory traversal can race
// with delayed directory metadata updates on managed filesystems, and must not
// admit files that were never hashed into the manifest.
const archiveFiles = [...files, 'RELEASE_MANIFEST.json']
const archiveFileList = join(releaseRoot, 'archive-files.list')
writeFileSync(archiveFileList, `${archiveFiles.join('\0')}\0`)
if (existsSync(archive)) rmSync(archive)
execFileSync('tar', ['-czf', archive, '-C', stageRoot, '--null', '-T', archiveFileList], { stdio: 'inherit' })
const archiveFailures = inspectArchive(archive, 'release/hebaelsherif-source.tgz')
if (archiveFailures.length) throw new Error(`Unsafe release archive:\n${archiveFailures.join('\n')}`)
if (existsSync(zipArchive)) rmSync(zipArchive)
execFileSync('zip', ['-q', zipArchive, '-@'], { cwd: stageRoot, input: `${archiveFiles.join('\n')}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
const zipFailures = inspectArchive(zipArchive, `release/${RELEASE_ZIP_NAME}`)
if (zipFailures.length) throw new Error(`Unsafe ZIP release archive:\n${zipFailures.join('\n')}`)
console.log(`package:release passed — ${files.length} payload files plus manifest, safe TGZ and ZIP; no local secrets or build/test artifacts`)
