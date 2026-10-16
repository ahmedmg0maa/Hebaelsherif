import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { forbiddenArchivePath, inspectArchive } from './archive-security.mjs'

const root = mkdtempSync(join(tmpdir(), 'heba-archive-test-'))
try {
  assert.equal(forbiddenArchivePath('.env'), 'secret environment path')
  assert.equal(forbiddenArchivePath('supabase/.temp/project-ref'), 'Supabase local link metadata')
  assert.equal(forbiddenArchivePath('.git/config'), 'Git internals')
  assert.equal(forbiddenArchivePath('test-results/results.json'), 'test/private artifact path')
  assert.equal(forbiddenArchivePath('database.dump'), 'database dump/backup')
  assert.equal(forbiddenArchivePath('.env.example'), null)

  const inner = join(root, 'inner')
  const outer = join(root, 'outer')
  mkdirSync(inner); mkdirSync(outer)
  writeFileSync(join(inner, '.env'), 'PLACEHOLDER_ONLY=1\n')
  const innerArchive = join(outer, 'nested.tgz')
  execFileSync('tar', ['-czf', innerArchive, '-C', inner, '.'])
  const outerArchive = join(root, 'outer.tgz')
  execFileSync('tar', ['-czf', outerArchive, '-C', outer, '.'])
  const failures = inspectArchive(outerArchive, 'fixture/outer.tgz')
  assert(failures.some((failure) => failure.includes('nested.tgz!.env') && failure.includes('secret environment path')))

  rmSync(inner, { recursive: true, force: true })
  mkdirSync(inner)
  const generatedSecret = `sb_${'secret'}_${'A'.repeat(24)}`
  writeFileSync(join(inner, 'config.txt'), generatedSecret)
  execFileSync('tar', ['-czf', innerArchive, '-C', inner, '.'])
  execFileSync('tar', ['-czf', outerArchive, '-C', outer, '.'])
  const secretFailures = inspectArchive(outerArchive, 'fixture/outer.tgz')
  assert(secretFailures.some((failure) => failure.includes('nested.tgz!config.txt') && failure.includes('Supabase secret key')))
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log('verify:archive-security passed — nested forbidden paths and secret content are rejected')
