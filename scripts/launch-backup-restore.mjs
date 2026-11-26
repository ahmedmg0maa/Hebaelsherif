import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceUrl = process.env.HEBA_LAUNCH_PRODUCTION_DATABASE_URL
const restoreUrl = process.env.HEBA_LAUNCH_RESTORE_DATABASE_URL
const cleanupTemporaryArtifacts = process.env.HEBA_LAUNCH_CLEANUP === '1'
const preflightOnly = process.argv.includes('--preflight-only')
const root = resolve(process.cwd(), '.launch-backups')

function fail(message) {
  throw new Error(message)
}

function findTool(name) {
  const configured = process.env[name === 'pg_dump' ? 'HEBA_LAUNCH_PG_DUMP' : name === 'pg_restore' ? 'HEBA_LAUNCH_PG_RESTORE' : 'HEBA_LAUNCH_PG_DUMPALL']
  if (configured && existsSync(configured)) return configured
  const scan = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const candidate = join(directory, entry.name)
      if (entry.isDirectory()) {
        const found = scan(candidate)
        if (found) return found
      } else if (entry.name.toLowerCase() === `${name}.exe`) return candidate
    }
    return null
  }
  const bundled = resolve(process.cwd(), '.launch-tools', 'postgresql-17.11')
  return existsSync(bundled) ? scan(bundled) : null
}

function connectionEnvironment(value, label, { readOnly = false } = {}) {
  let url
  try {
    url = new URL(value)
  } catch {
    fail(`${label} must be a PostgreSQL connection URL supplied only through the secure execution environment.`)
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname || !url.password) {
    fail(`${label} is incomplete. No connection value was logged.`)
  }
  const environment = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE: url.searchParams.get('sslmode') || 'require',
  }
  if (readOnly) {
    environment.PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000'
    environment.PGAPPNAME = 'heba-launch-production-readonly'
  }
  return environment
}

function execute(binary, args, env, label, capture = false) {
  const result = spawnSync(binary, args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'ignore',
  })
  if (result.status !== 0) fail(`${label} failed with exit code ${result.status ?? 'unknown'}; no credential or database output was recorded.`)
  return capture ? result.stdout : ''
}

if (!sourceUrl || (!preflightOnly && !restoreUrl)) {
  fail('The secure Production connection and, for a restore run, the isolated restore connection are required only through the execution environment. Do not place them in chat or in a repository file.')
}

const pgDump = findTool('pg_dump')
const pgRestore = findTool('pg_restore')
const pgDumpAll = findTool('pg_dumpall')
const psql = findTool('psql')
if (!pgDump || !pgRestore || !pgDumpAll || !psql) fail('The approved PostgreSQL command-line tools are unavailable.')

const sourceEnv = connectionEnvironment(sourceUrl, 'HEBA_LAUNCH_PRODUCTION_DATABASE_URL', { readOnly: true })
if (
  sourceEnv.PGUSER !== 'postgres.zfbwpubsnuijybxjuidc' ||
  !/^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(sourceEnv.PGHOST) ||
  sourceEnv.PGPORT !== '5432' ||
  sourceEnv.PGDATABASE !== 'postgres'
) {
  fail('The Production connection identity does not match the approved project Session pooler contract.')
}

const preflightSql = "select json_build_object('read_only', current_setting('transaction_read_only') = 'on', 'database_ok', current_database() = 'postgres', 'bookings_present', to_regclass('public.bookings') is not null, 'orders_present', to_regclass('public.orders') is not null, 'audit_logs_present', to_regclass('public.audit_logs') is not null, 'migration_history_present', to_regclass('supabase_migrations.schema_migrations') is not null)::text;"
let preflight
try {
  preflight = JSON.parse(execute(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', preflightSql], sourceEnv, 'Read-only Production preflight', true).trim())
} catch {
  fail('The read-only Production preflight returned an invalid sanitized result.')
}
if (!preflight.read_only || !preflight.database_ok || !preflight.bookings_present || !preflight.orders_present || !preflight.audit_logs_present || !preflight.migration_history_present) {
  fail('The read-only Production preflight did not match the approved schema contract.')
}
const migrationSql = "select json_build_object('count', count(*), 'latest', coalesce(max(version::text), 'none'))::text from supabase_migrations.schema_migrations;"
let migrationHistory
try {
  migrationHistory = JSON.parse(execute(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', migrationSql], sourceEnv, 'Read-only migration history preflight', true).trim())
} catch {
  fail('The read-only migration history preflight returned an invalid sanitized result.')
}
process.stdout.write(JSON.stringify({
  result: 'PRODUCTION_READ_ONLY_PREFLIGHT_PASSED',
  projectRef: 'zfbwpubsnuijybxjuidc',
  transactionReadOnly: true,
  migrationCount: Number(migrationHistory.count),
  latestMigration: String(migrationHistory.latest),
}) + '\n')
if (preflightOnly) process.exit(0)

mkdirSync(root, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const runId = randomUUID()
const archive = join(root, `production-logical-${stamp}-${runId}.dump`)
const globals = join(root, `production-globals-${stamp}-${runId}.sql`)
const restoreEnv = connectionEnvironment(restoreUrl, 'HEBA_LAUNCH_RESTORE_DATABASE_URL')

try {
  execute(pgDump, ['--format=custom', '--file', archive, '--verbose'], sourceEnv, 'Logical database backup')
  execute(pgDumpAll, ['--globals-only', '--no-role-passwords', '--file', globals], sourceEnv, 'Logical role backup')
  const listing = execute(pgRestore, ['--list', archive], sourceEnv, 'Backup archive validation', true)
  if (!listing.includes('TABLE DATA') || !listing.includes('SCHEMA - public')) fail('Backup archive validation did not find the expected public schema and table data entries.')

  execute(pgRestore, ['--clean', '--if-exists', '--no-owner', '--no-acl', '--exit-on-error', '--dbname', restoreEnv.PGDATABASE, archive], restoreEnv, 'Isolated restore')
  const checkSql = "select (to_regclass('public.bookings') is not null and to_regclass('public.orders') is not null and to_regclass('public.audit_logs') is not null and (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity) > 0) as restored_contract_ok;"
  const restored = execute(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', checkSql], restoreEnv, 'Isolated restore integrity check', true).trim()
  if (restored !== 't') fail('The isolated restore integrity contract did not pass.')

  const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex')
  const size = statSync(archive).size
  process.stdout.write(JSON.stringify({
    result: 'LOGICAL_BACKUP_AND_ISOLATED_RESTORE_PASSED',
    sha256: checksum,
    bytes: size,
    rpo: 'point-in-time at logical backup completion',
    rto: 'record elapsed execution time in the launch closure',
    temporaryArtifactsDeleted: cleanupTemporaryArtifacts,
    storageObjects: 'not included; export/restore them separately through the approved Storage provider path',
  }) + '\n')
} finally {
  if (cleanupTemporaryArtifacts) {
    rmSync(archive, { force: true })
    rmSync(globals, { force: true })
  }
}
