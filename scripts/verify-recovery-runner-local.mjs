import fs from 'node:fs'

const runner = fs.readFileSync('scripts/run-launch-recovery-drill.ps1', 'utf8')
const interactive = fs.readFileSync('scripts/run-launch-recovery-drill-interactive.ps1', 'utf8')
const backup = fs.readFileSync('scripts/launch-backup-restore.mjs', 'utf8')

const assertions = [
  [runner.includes("$sourceUri.Host -notlike '*.pooler.supabase.com'"), 'runner requires a Supabase pooler host'],
  [runner.includes('$sourceUri.Port -ne 5432'), 'runner requires Session pooler port 5432'],
  [runner.includes('$sourceUser -ne "postgres.$productionRef"'), 'runner requires the tenant-qualified Production user'],
  [runner.indexOf('--preflight-only') < runner.indexOf('supabase projects create'), 'runner performs the read-only Production preflight before creating a restore target'],
  [runner.includes('postgres.$($target.ref)') && runner.includes('$($sourceUri.Host):5432'), 'restore target reuses the approved Session pooler host with its own tenant'],
  [backup.includes("default_transaction_read_only=on") && backup.includes("PRODUCTION_READ_ONLY_PREFLIGHT_PASSED"), 'database preflight and backup source sessions are forced read-only'],
  [interactive.includes("[YOUR-PASSWORD]") && interactive.includes('Read-Host') && interactive.includes('-AsSecureString'), 'interactive runner collects the password without terminal echo'],
  [interactive.includes('[string]$SessionPoolerTemplate') && interactive.includes('$SessionPoolerTemplate'), 'interactive runner can receive a public password-placeholder template without exposing a secret'],
  [interactive.includes('[Uri]::EscapeDataString($plainPassword)'), 'interactive runner URL-encodes the password'],
  [interactive.includes('Remove-Item Env:HEBA_LAUNCH_PRODUCTION_DATABASE_URL'), 'interactive runner clears the connection variable'],
  [interactive.includes('ZeroFreeBSTR($pointer)'), 'interactive runner clears unmanaged password memory'],
  [!interactive.includes('Write-Host $plainPassword') && !interactive.includes('Write-Output $plainPassword'), 'interactive runner never prints the password'],
]

const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message)
if (failures.length) {
  console.error(`verify:recovery-runner-local failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('verify:recovery-runner-local passed — Session pooler enforcement, isolated-target routing and hidden secret cleanup verified')
