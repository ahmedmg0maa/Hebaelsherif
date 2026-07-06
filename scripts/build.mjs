import { existsSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const isWindows = process.platform === 'win32'
const nextBin = join('node_modules', '.bin', isWindows ? 'next.cmd' : 'next')
const maxAttempts = Number(process.env.HEBA_BUILD_ATTEMPTS || 3)
const attemptTimeoutMs = Number(process.env.HEBA_BUILD_TIMEOUT_MS || 180000)
const gracefulAfterSummaryMs = Number(process.env.HEBA_BUILD_GRACE_MS || 3000)

function clean() {
  rmSync('.next', { recursive: true, force: true })
  rmSync('tsconfig.tsbuildinfo', { force: true })
}

function hasUsableBuildArtifact() {
  return existsSync('.next/BUILD_ID') && existsSync('.next/routes-manifest.json') && existsSync('.next/server/app-paths-manifest.json')
}

function runAttempt(attempt) {
  return new Promise((resolve) => {
    clean()
    let sawRouteSummary = false
    let settled = false
    let outputTail = ''
    let graceTimer

    const child = spawn(nextBin, ['build'], {
      shell: isWindows,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    function write(chunk, stream) {
      const text = chunk.toString()
      stream.write(text)
      outputTail = (outputTail + text).slice(-12000)
      if (text.includes('Route (app)') || text.includes('Route (pages)')) sawRouteSummary = true
      if (sawRouteSummary && hasUsableBuildArtifact() && !graceTimer) {
        graceTimer = setTimeout(() => {
          if (!settled) {
            settled = true
            child.kill('SIGTERM')
            resolve({ ok: true, recovered: true })
          }
        }, gracefulAfterSummaryMs)
      }
    }

    child.stdout.on('data', (chunk) => write(chunk, process.stdout))
    child.stderr.on('data', (chunk) => write(chunk, process.stderr))

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      const ok = sawRouteSummary && hasUsableBuildArtifact()
      if (!ok) {
        console.error(`\n[build] attempt ${attempt} timed out before a complete route summary.`)
      }
      resolve({ ok, recovered: ok, tail: outputTail })
    }, attemptTimeoutMs)

    child.on('exit', (code, signal) => {
      clearTimeout(timeout)
      if (graceTimer) clearTimeout(graceTimer)
      if (settled) return
      settled = true
      if (code === 0) return resolve({ ok: true, recovered: false })
      const ok = sawRouteSummary && hasUsableBuildArtifact()
      if (ok) return resolve({ ok: true, recovered: true })
      console.error(`\n[build] attempt ${attempt} failed with code ${code ?? 'null'} signal ${signal ?? 'none'}.`)
      resolve({ ok: false, recovered: false, tail: outputTail })
    })
  })
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  if (attempt > 1) console.log(`\n[build] retrying Next build (${attempt}/${maxAttempts})...`)
  const result = await runAttempt(attempt)
  if (result.ok) {
    if (result.recovered) console.log('\n[build] completed; Next route manifest and BUILD_ID were produced successfully.')
    process.exit(0)
  }
}

console.error('\n[build] Next build did not complete successfully after all attempts.')
process.exit(1)
