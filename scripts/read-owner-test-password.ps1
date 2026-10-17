# One-time local test input. Never prints or changes the owner's password.
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$directory = Join-Path $project '.launch-tools'
[IO.Directory]::CreateDirectory($directory) | Out-Null
Write-Host 'Heba launch test - enter the EXISTING owner password locally.'
Write-Host 'Input is hidden. Windows encrypts the temporary value for this user only.'
Write-Host 'The test runner removes it when testing finishes. No password reset occurs.'
$password = Read-Host 'Existing owner password (hidden)' -AsSecureString
if ($password.Length -eq 0) { throw 'No password entered.' }
$encrypted = ConvertFrom-SecureString -SecureString $password
[IO.File]::WriteAllText((Join-Path $directory 'owner-test-password.dpapi'), $encrypted)
$password.Dispose()
$encrypted = $null
Write-Host 'Encrypted test input saved. You may close this window.'
Read-Host 'Press Enter to close' | Out-Null
