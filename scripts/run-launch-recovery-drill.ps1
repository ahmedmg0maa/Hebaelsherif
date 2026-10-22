[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$productionConnection = $env:HEBA_LAUNCH_PRODUCTION_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($productionConnection)) {
  throw 'HEBA_LAUNCH_PRODUCTION_DATABASE_URL must be supplied only through the secure execution environment. Do not place it in chat or a repository file.'
}

$productionRef = 'zfbwpubsnuijybxjuidc'
$sourceUri = $null
try { $sourceUri = [Uri]$productionConnection } catch { throw 'The secure database connection is not a valid URL. No value was logged.' }
$sourceUser = [Uri]::UnescapeDataString(($sourceUri.UserInfo -split ':', 2)[0])
if ($sourceUri.Scheme -notin @('postgres', 'postgresql') -or
    $sourceUri.Host -notlike '*.pooler.supabase.com' -or
    $sourceUri.Port -ne 5432 -or
    $sourceUser -ne "postgres.$productionRef" -or
    [string]::IsNullOrWhiteSpace($sourceUri.UserInfo)) {
  throw 'Use the Production Session pooler URL from Supabase Connect (port 5432 and postgres.<project-ref> user). Direct IPv6 and transaction-pooler URLs are rejected.'
}
$prefix = 'hebaelsherif-restore-'
$projectResponse = @(supabase projects list --output-format json | ConvertFrom-Json)
$before = @($projectResponse.projects)
$production = @($before | Where-Object { $_.ref -eq $productionRef -and $_.status -eq 'ACTIVE_HEALTHY' })
if ($production.Count -ne 1) { throw 'The authorized Production project was not uniquely identified as healthy. No backup started.' }
$organizationId = [string]$production[0].organization_id
$region = [string]$production[0].region
if ([string]::IsNullOrWhiteSpace($organizationId) -or [string]::IsNullOrWhiteSpace($region)) { throw 'The authorized Production project lacks organization or region metadata. No backup started.' }

# Fail before creating a disposable project unless the database itself confirms
# a read-only session and the expected schema/migration-history contract.
& node scripts/launch-backup-restore.mjs --preflight-only
if ($LASTEXITCODE -ne 0) { throw 'The read-only Production preflight did not pass. No restore target or backup was created.' }

$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$restorePassword = [Convert]::ToHexString($bytes).ToLowerInvariant()
$name = "$prefix$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'))"
$target = $null
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$passed = $false

try {
  # The project has no Production data until the controlled restore below. The
  # password exists only in this process and is never emitted or persisted.
  & supabase projects create $name --org-id $organizationId --db-password $restorePassword --region $region --size nano --yes *> $null
  if ($LASTEXITCODE -ne 0) { throw 'The isolated restore target could not be created. No backup or Production change was made.' }

  $afterResponse = @(supabase projects list --output-format json | ConvertFrom-Json)
  $after = @($afterResponse.projects)
  $created = @($after | Where-Object { $_.ref -notin $before.ref -and $_.name -eq $name })
  if ($created.Count -ne 1 -or $created[0].status -ne 'ACTIVE_HEALTHY') { throw 'The isolated restore target was not uniquely identified as healthy.' }
  $target = $created[0]
  $escapedPassword = [uri]::EscapeDataString($restorePassword)
  # The target is created in the same region. Reusing the dashboard-provided
  # Session pooler host avoids guessing a pooler region and works on IPv4-only
  # execution networks. The tenant-qualified user selects the isolated target.
  $env:HEBA_LAUNCH_RESTORE_DATABASE_URL = "postgresql://postgres.$($target.ref):$escapedPassword@$($sourceUri.Host):5432/postgres?sslmode=require"
  $env:HEBA_LAUNCH_CLEANUP = '1'

  & node scripts/launch-backup-restore.mjs
  if ($LASTEXITCODE -ne 0) { throw 'The logical backup or isolated restore contract did not pass.' }
  $passed = $true
} finally {
  Remove-Item Env:HEBA_LAUNCH_RESTORE_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:HEBA_LAUNCH_CLEANUP -ErrorAction SilentlyContinue
  if ($target) {
    & supabase projects delete $target.ref --yes *> $null
    if ($LASTEXITCODE -ne 0) { Write-Error 'The isolated restore target must be deleted manually; it contains restored Production data and must not be used as staging.' }
  }
}

if ($passed) {
  $stopwatch.Stop()
  [PSCustomObject]@{
    Result = 'RECOVERY_DRILL_PASSED'
    RestoreTarget = 'isolated-and-deleted'
    RestoreTargetDeleted = $true
    ElapsedSeconds = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
    RPO = 'point-in-time at logical backup completion'
  } | ConvertTo-Json -Compress
}
