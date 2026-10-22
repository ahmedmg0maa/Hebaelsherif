// Windows-only local test transport. The encrypted file is never committed.
import { execFileSync } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ownerTestInputPath = fileURLToPath(new URL('../.launch-tools/owner-test-password.dpapi', import.meta.url))

export function readOwnerTestPassword({ inputPath = ownerTestInputPath, removeAfterRead = true } = {}) {
  if (process.platform !== 'win32') throw Error('Owner test input requires Windows DPAPI.')
  if (!existsSync(inputPath)) throw Error('Save the current password through read-owner-test-password.ps1 first.')
  const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  // Only a file path and static code appear in argv. Decrypted bytes stay in a
  // captured anonymous pipe, never the terminal, environment, file, or error log.
  const script = "$ErrorActionPreference='Stop'; Import-Module ([IO.Path]::Combine($PSHOME,'Modules','Microsoft.PowerShell.Security','Microsoft.PowerShell.Security.psd1')); $s=ConvertTo-SecureString ([IO.File]::ReadAllText('" + inputPath.replaceAll("'", "''") + "')); $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p);$s.Dispose()}"
  let bytes
  try {
    bytes = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000,
    })
    if (!bytes.length) throw Error('Empty input')
    const password = bytes.toString('utf8')
    if (removeAfterRead) unlinkSync(inputPath)
    return password
  } catch {
    // execFileSync errors can contain captured stdout. Never attach/print them.
    throw Error('Cannot decrypt the local owner input. Re-enter it with the corrected input script.')
  } finally { bytes?.fill(0) }
}
