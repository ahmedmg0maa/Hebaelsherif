import { execFileSync } from 'node:child_process'
import { lstatSync, mkdtempSync, openSync, closeSync, readSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'

const ARCHIVE_NAME = /\.(?:zip|tar|tgz|tar\.gz|gz|7z|rar|bz2|xz)$/i
const DUMP_NAME = /\.(?:dump|backup|bak|bkp)$/i
const TEST_ARTIFACT_SEGMENTS = new Set(['playwright-report', 'test-results', 'coverage'])
const SECRET_FILE = /\.(?:pem|key|p12|pfx)$/i
const MAX_ARCHIVE_DEPTH = 5
const MAX_ARCHIVE_ENTRIES = 20_000
const MAX_SCANNED_TEXT_BYTES = 2_000_000

const secretPatterns = [
  { name: 'Supabase secret key', regex: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: 'service-role JWT', regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{20,}/ },
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
]

function normalizeEntry(value) {
  let normalized = String(value).replaceAll('\\', '/')
  while (normalized.startsWith('./')) normalized = normalized.slice(2)
  return normalized.replace(/\/$/, '')
}

export function isArchiveName(file) {
  return ARCHIVE_NAME.test(file)
}

export function isDumpName(file) {
  return DUMP_NAME.test(file) || /(^|\/)(?:database|postgres|pg|db)[-_]?dump(?:\.sql)?$/i.test(file)
}

export function forbiddenArchivePath(file) {
  const normalized = normalizeEntry(file)
  if (/^docs\/(?:evidence|admin-current-state-evidence|admin-foundation-phase-one-evidence)(?:\/|$)/i.test(normalized)) return 'test/private artifact path'
  const lower = normalized.toLowerCase()
  const parts = lower.split('/').filter(Boolean)
  const name = parts.at(-1) ?? ''
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized) || parts.includes('..')) return 'unsafe archive path'
  if (name !== '.env.example' && (name === '.env' || name.startsWith('.env.'))) return 'secret environment path'
  if (parts.includes('.git')) return 'Git internals'
  if (lower === 'supabase/.temp' || lower.startsWith('supabase/.temp/') || lower.includes('/supabase/.temp/')) return 'Supabase local link metadata'
  if (parts.some((part) => TEST_ARTIFACT_SEGMENTS.has(part)) || ['reports', 'exports'].includes(parts[0])) return 'test/private artifact path'
  if (SECRET_FILE.test(name)) return 'private credential file'
  if (isDumpName(lower)) return 'database dump/backup'
  return null
}

function archiveFormat(file) {
  const size = statSync(file).size
  const length = Math.min(size, 512)
  const buffer = Buffer.alloc(length)
  const descriptor = openSync(file, 'r')
  try { readSync(descriptor, buffer, 0, length, 0) } finally { closeSync(descriptor) }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return 'supported'
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) return 'supported'
  if (buffer.subarray(257, 262).toString() === 'ustar') return 'supported'
  if (buffer.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))) return 'unsupported'
  if (buffer.subarray(0, 7).toString('hex').startsWith('526172211a070')) return 'unsupported'
  return isArchiveName(file) ? 'unsupported' : 'none'
}

function isZipArchive(file) {
  const buffer = Buffer.alloc(2)
  const descriptor = openSync(file, 'r')
  try { readSync(descriptor, buffer, 0, 2, 0) } finally { closeSync(descriptor) }
  return buffer[0] === 0x50 && buffer[1] === 0x4b
}

function secretFinding(file) {
  if (basename(file).toLowerCase() === '.env.example' || statSync(file).size > MAX_SCANNED_TEXT_BYTES) return null
  let source
  try { source = readFileSync(file, 'utf8') } catch { return null }
  for (const pattern of secretPatterns) if (pattern.regex.test(source)) return pattern.name
  return null
}

function walkExtracted(root, current = root, files = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name)
    const relativePath = normalizeEntry(relative(root, absolute))
    if (entry.isSymbolicLink() || lstatSync(absolute).isSymbolicLink()) files.push({ absolute, relativePath, symbolic: true })
    else if (entry.isDirectory()) walkExtracted(root, absolute, files)
    else if (entry.isFile()) files.push({ absolute, relativePath, symbolic: false })
  }
  return files
}

export function inspectArchive(archivePath, displayPath = archivePath, state = { depth: 0, archives: 0 }) {
  const failures = []
  const absoluteArchive = resolve(archivePath)
  const format = archiveFormat(absoluteArchive)
  if (format === 'none') return failures
  if (format === 'unsupported') return [`${displayPath}: archive format cannot be safely inspected`]
  if (state.depth >= MAX_ARCHIVE_DEPTH) return [`${displayPath}: nested archive depth exceeds ${MAX_ARCHIVE_DEPTH}`]
  if (++state.archives > 100) return [`${displayPath}: too many nested archives`]

  let entries
  try {
    const zip = isZipArchive(absoluteArchive) && process.platform !== 'win32'
    entries = execFileSync(zip ? 'unzip' : 'tar', zip ? ['-Z1', absoluteArchive] : ['-tf', absoluteArchive], { encoding: 'utf8', timeout: 30_000, maxBuffer: 20_000_000 })
      .split(/\r?\n/).map(normalizeEntry).filter(Boolean)
  } catch {
    return [`${displayPath}: archive listing failed`]
  }
  if (entries.length > MAX_ARCHIVE_ENTRIES) return [`${displayPath}: archive contains more than ${MAX_ARCHIVE_ENTRIES} entries`]
  for (const entry of entries) {
    const reason = forbiddenArchivePath(entry)
    if (reason) failures.push(`${displayPath}!${entry}: ${reason}`)
  }
  // Do not extract an archive already known to contain sensitive/unsafe paths.
  if (failures.length) return failures

  const extractionRoot = mkdtempSync(join(tmpdir(), 'heba-archive-audit-'))
  try {
    try {
      const zip = isZipArchive(absoluteArchive) && process.platform !== 'win32'
      execFileSync(zip ? 'unzip' : 'tar', zip ? ['-qq', absoluteArchive, '-d', extractionRoot] : ['-xf', absoluteArchive, '-C', extractionRoot], { timeout: 60_000, maxBuffer: 20_000_000 })
    } catch {
      return [`${displayPath}: archive extraction failed`]
    }
    const files = walkExtracted(extractionRoot)
    for (const file of files) {
      if (file.symbolic) {
        failures.push(`${displayPath}!${file.relativePath}: symbolic links are forbidden in release archives`)
        continue
      }
      const reason = forbiddenArchivePath(file.relativePath)
      if (reason) failures.push(`${displayPath}!${file.relativePath}: ${reason}`)
      const secret = secretFinding(file.absolute)
      if (secret) failures.push(`${displayPath}!${file.relativePath}: contains a ${secret}`)
      if (archiveFormat(file.absolute) !== 'none') {
        failures.push(...inspectArchive(file.absolute, `${displayPath}!${file.relativePath}`, { depth: state.depth + 1, archives: state.archives }))
      }
    }
  } finally {
    rmSync(extractionRoot, { recursive: true, force: true })
  }
  return failures
}
