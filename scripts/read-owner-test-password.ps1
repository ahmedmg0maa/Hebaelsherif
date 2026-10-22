# One-time local test input. Never prints or changes the owner's password.
param([switch]$Dialog, [switch]$SelfTest, [switch]$NoPause)
$ErrorActionPreference = 'Stop'
# A Windows PowerShell child can inherit PowerShell 7's PSModulePath. Load the
# security module belonging to THIS host rather than autoloading another version.
$securityManifest = [IO.Path]::Combine($PSHOME, 'Modules', 'Microsoft.PowerShell.Security', 'Microsoft.PowerShell.Security.psd1')
Import-Module -Name $securityManifest -ErrorAction Stop
$project = Split-Path -Parent $PSScriptRoot
$directory = Join-Path $project '.launch-tools'
[IO.Directory]::CreateDirectory($directory) | Out-Null
$target = Join-Path $directory 'owner-test-password.dpapi'
if ($SelfTest) {
  $probe = [Guid]::NewGuid().ToString('N') + [char]0x0633 + "'`" "
  $secureProbe = ConvertTo-SecureString $probe -AsPlainText -Force
  $cipher = ConvertFrom-SecureString $secureProbe
  $restored = ConvertTo-SecureString $cipher
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($restored)
  try {
    if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) -cne $probe -or $cipher.Contains($probe)) { throw 'Secret round-trip failed.' }
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureProbe.Dispose(); $restored.Dispose()
    $probe = $null; $cipher = $null
  }
  Write-Host 'DPAPI input/consumer round-trip passed. No owner input read or modified.'
  exit 0
}
if ([IO.File]::Exists($target)) { [IO.File]::Delete($target) }
if ($Dialog) {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'Heba - existing owner password / local test'
  $form.ClientSize = New-Object System.Drawing.Size(520,210)
  $form.StartPosition = 'CenterScreen'
  $form.TopMost = $true
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $label = New-Object System.Windows.Forms.Label
  $label.Text = 'Enter the CURRENT owner password for the login test. Input is masked. This does not change the password.'
  $label.Location = New-Object System.Drawing.Point(20,20)
  $label.Size = New-Object System.Drawing.Size(480,45)
  $inputBox = New-Object System.Windows.Forms.TextBox
  $inputBox.Location = New-Object System.Drawing.Point(20,80)
  $inputBox.Size = New-Object System.Drawing.Size(480,28)
  $inputBox.UseSystemPasswordChar = $true
  $save = New-Object System.Windows.Forms.Button
  $save.Text = 'Save locally for test'
  $save.Location = New-Object System.Drawing.Point(280,135)
  $save.Size = New-Object System.Drawing.Size(220,42)
  $save.Add_Click({
    if ($inputBox.Text.Length -eq 0) { return }
    $secure = ConvertTo-SecureString $inputBox.Text -AsPlainText -Force
    try {
      $encrypted = ConvertFrom-SecureString $secure
      [IO.File]::WriteAllText($target, $encrypted)
      $inputBox.Clear()
      $form.Close()
    } catch {
      [void][System.Windows.Forms.MessageBox]::Show('Could not encrypt input. No plaintext was saved.','Heba local input')
    } finally { $secure.Dispose(); $encrypted = $null }
  })
  $form.AcceptButton = $save
  $form.Controls.AddRange(@($label,$inputBox,$save))
  $form.Add_Shown({[void]$inputBox.Focus()})
  try { [void]$form.ShowDialog() } finally { $inputBox.Clear(); $form.Dispose() }
  exit 0
}
Write-Host 'Heba launch test - enter the EXISTING owner password locally.'
Write-Host 'Input is hidden. Windows encrypts the temporary value for this user only.'
Write-Host 'The test runner removes it when testing finishes. No password reset occurs.'
$password = Read-Host 'Existing owner password (hidden)' -AsSecureString
if ($password.Length -eq 0) { throw 'No password entered.' }
try {
  $encrypted = ConvertFrom-SecureString -SecureString $password
  [IO.File]::WriteAllText($target, $encrypted)
} finally { $password.Dispose(); $encrypted = $null }
Write-Host 'Encrypted test input saved. You may close this window.'
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
