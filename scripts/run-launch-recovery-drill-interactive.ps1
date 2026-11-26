[CmdletBinding()]
param(
  [string]$SessionPoolerTemplate
)

$ErrorActionPreference = 'Stop'
$template = if ([string]::IsNullOrWhiteSpace($SessionPoolerTemplate)) {
  Read-Host 'Paste the NEW Supabase Session pooler URL template (port 5432) with [YOUR-PASSWORD] unchanged'
} else {
  $SessionPoolerTemplate
}
if ($template -notmatch [regex]::Escape('[YOUR-PASSWORD]')) {
  throw 'The template must keep [YOUR-PASSWORD]. Do not paste a connection string that already contains the password.'
}

$securePassword = Read-Host 'Enter the NEW database password (hidden)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$plainPassword = $null
try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainPassword)) { throw 'The password cannot be empty.' }
  $encodedPassword = [Uri]::EscapeDataString($plainPassword)
  $env:HEBA_LAUNCH_PRODUCTION_DATABASE_URL = $template.Replace('[YOUR-PASSWORD]', $encodedPassword)
  & "$PSScriptRoot\run-launch-recovery-drill.ps1"
  if ($LASTEXITCODE -ne 0) { throw 'The recovery drill did not complete.' }
} finally {
  Remove-Item Env:HEBA_LAUNCH_PRODUCTION_DATABASE_URL -ErrorAction SilentlyContinue
  $plainPassword = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
