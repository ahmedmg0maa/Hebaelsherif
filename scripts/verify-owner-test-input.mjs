import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { strict as assert } from 'node:assert'
import path from 'node:path'
import { readOwnerTestPassword } from './owner-test-secret.mjs'

if (process.platform !== 'win32') throw Error('Run this input compatibility test on Windows.')
const directory = fileURLToPath(new URL('../.launch-tools/owner-input-fixtures/', import.meta.url))
mkdirSync(directory, { recursive: true })
const inputPath = path.join(directory, randomUUID() + '.dpapi')
const script = "$ErrorActionPreference='Stop'; Import-Module ([IO.Path]::Combine($PSHOME,'Modules','Microsoft.PowerShell.Security','Microsoft.PowerShell.Security.psd1')); $s=ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force; try {[Console]::Write((ConvertFrom-SecureString $s))} finally {$s.Dispose()}"
const fixture = randomUUID() + " س'\" $ `  "
let tested = 0
try {
  for (const shell of [path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), 'pwsh.exe']) {
    let encrypted
    try { encrypted = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-Command', script], { input: fixture, encoding: 'utf8', windowsHide: true, stdio: ['pipe','pipe','pipe'], timeout: 15000 }) }
    catch { throw Error('Fixture encryption failed; no secret output included.') }
    writeFileSync(inputPath, encrypted.trim())
    assert(!readFileSync(inputPath, 'utf8').includes(fixture))
    assert.equal(readOwnerTestPassword({ inputPath }), fixture)
    tested++
  }
  writeFileSync(inputPath, 'invalid encrypted test fixture')
  assert.throws(() => readOwnerTestPassword({ inputPath }), /Cannot decrypt/)
  console.log(`Owner input compatibility passed: ${tested} producing hosts, actual Node consumer, Unicode/quotes/whitespace, removal after read and safe corrupt-input failure. No owner input touched.`)
} finally { rmSync(inputPath, { force: true }) }
