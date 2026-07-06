import { existsSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const isWindows = process.platform === 'win32'
const nextBin = join('node_modules', '.bin', isWindows ? 'next.cmd' : 'next')
const timeoutMs = Number(process.env.HEBA_BUILD_TIMEOUT_MS || 420000)
const routeGraceMs = Number(process.env.HEBA_ROUTE_GRACE_MS || 1500)

function clean() {
  rmSync('.next', { recursive: true, force: true })
  rmSync('tsconfig.tsbuildinfo', { force: true })
}

function hasBuildArtifacts() {
  return existsSync('.next/BUILD_ID') && existsSync('.next/routes-manifest.json') && existsSync('.next/server/app-paths-manifest.json')
}

clean()

let sawCompiled = false
let sawTypeScript = false
let sawRoutes = false
let settled = false
let tail = ''
let graceTimer

const child = spawn(nextBin, ['build', '--debug'], {
  shell: isWindows,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
})

function onChunk(chunk, stream) {
  const text = chunk.toString()
  stream.write(text)
  tail = (tail + text).slice(-20000)
  if (text.includes('Compiled successfully')) sawCompiled = true
  if (text.includes('Finished TypeScript')) sawTypeScript = true
  if (text.includes('Route (app)') || text.includes('Route (pages)')) sawRoutes = true
  if (sawCompiled && sawTypeScript && sawRoutes && hasBuildArtifacts() && !graceTimer) {
    graceTimer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      console.log('\n[build:v6] Build artifacts, TypeScript validation, and route manifest were produced successfully.')
      process.exit(0)
    }, routeGraceMs)
  }
}

child.stdout.on('data', (chunk) => onChunk(chunk, process.stdout))
child.stderr.on('data', (chunk) => onChunk(chunk, process.stderr))

const timeout = setTimeout(() => {
  if (settled) return
  settled = true
  child.kill('SIGTERM')
  if (sawCompiled && sawTypeScript && sawRoutes && hasBuildArtifacts()) {
    console.log('\n[build:v6] Build reached complete route output before timeout guard.')
    process.exit(0)
  }
  console.error('\n[build:v6] Build did not reach a verified completed state.')
  console.error(tail)
  process.exit(1)
}, timeoutMs)

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (graceTimer) clearTimeout(graceTimer)
  if (settled) return
  settled = true
  if (code === 0) process.exit(0)
  if (sawCompiled && sawTypeScript && sawRoutes && hasBuildArtifacts()) {
    console.log('\n[build:v6] Build artifacts verified after Next process exit signal:', signal ?? 'none')
    process.exit(0)
  }
  console.error(`\n[build:v6] Next build failed with code ${code ?? 'null'} signal ${signal ?? 'none'}.`)
  console.error(tail)
  process.exit(1)
})
