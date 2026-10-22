import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export function walk(dir, exts = null, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === '.git') continue
      walk(p, exts, acc)
    } else if (!exts || exts.some((e) => name.endsWith(e))) {
      acc.push(p)
    }
  }
  return acc
}

export function read(p) {
  return readFileSync(p, 'utf8')
}

export function report(name, failures) {
  if (failures.length === 0) {
    console.log(`✅ ${name}: passed`)
    process.exit(0)
  }
  console.error(`❌ ${name}: ${failures.length} failure(s)`)
  for (const f of failures) console.error(`   - ${f}`)
  process.exit(1)
}
