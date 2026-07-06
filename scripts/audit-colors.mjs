import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const legacyAliasUsage = new Map()

const allowedHexFiles = new Set([
  'src/app/globals.css',
  'src/app/layout.tsx',
  'src/constants/design.ts',
  'src/constants/brand.config.ts',
  'docs/V7_COLOR_SYSTEM.md',
  'docs/V7_VISUAL_TARGETS.md',
  'scripts/audit-colors.mjs',
])

const requiredTokens = [
  '--color-ivory',
  '--color-soft-white',
  '--color-sand',
  '--color-taupe',
  '--color-khaki',
  '--color-deep-teal',
  '--color-teal-hover',
  '--color-burgundy',
  '--color-burgundy-soft',
  '--color-cobalt',
  '--color-antique-gold',
  '--color-muted-gold',
  '--color-ink',
  '--color-text-soft',
  '--color-border',
]

const expectedPaletteValues = [
  '#F7F2EA',
  '#FFFDF8',
  '#D8D0BE',
  '#9C9484',
  '#A79C82',
  '#0E3440',
  '#123F4C',
  '#7A1F2B',
  '#B45A64',
  '#2F6FA8',
  '#B59A65',
  '#D5C49E',
  '#1F1E1C',
  '#6E675D',
  '#E6DDCF',
]

const legacyClassNames = [
  'petrol',
  'olive',
  'warm-gray',
  'charcoal',
  'mauve',
  'rose',
]

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'archive'].includes(item.name)) continue

    const full = path.join(dir, item.name)
    if (item.isDirectory()) walk(full, files)
    else if (/\.(tsx?|jsx?|css|mjs|json|md)$/.test(item.name)) files.push(full)
  }

  return files
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const globals = read('src/app/globals.css')
for (const token of requiredTokens) {
  if (!globals.includes(token)) errors.push(`Missing V7 color token in globals.css: ${token}`)
}

const constants = read('src/constants/design.ts')
for (const value of expectedPaletteValues) {
  if (!constants.includes(value)) errors.push(`Missing V7 palette value in design constants: ${value}`)
}

const files = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'scripts')),
  ...walk(path.join(root, 'docs')).filter((file) => !file.includes(`${path.sep}archive${path.sep}`)),
  path.join(root, 'tailwind.config.ts'),
  path.join(root, 'package.json'),
  path.join(root, 'vercel.json'),
].filter((file) => fs.existsSync(file))

for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  const text = fs.readFileSync(file, 'utf8')
  const hexMatches = text.match(/#[0-9A-Fa-f]{3,8}\b/g) || []

  if (hexMatches.length && !allowedHexFiles.has(rel)) {
    errors.push(`Uncontrolled hex color in ${rel}: ${[...new Set(hexMatches)].join(', ')}`)
  }

  if (rel.startsWith('src/') && !allowedHexFiles.has(rel)) {
    for (const legacy of legacyClassNames) {
      const pattern = new RegExp(`(?:text|bg|border|from|via|to|ring|shadow)-${legacy}(?:\\b|/)`)
      if (pattern.test(text)) {
        const current = legacyAliasUsage.get(legacy) || { count: 0, samples: [] }
        current.count += 1
        if (current.samples.length < 3) current.samples.push(rel)
        legacyAliasUsage.set(legacy, current)
      }
    }
  }
}

if (legacyAliasUsage.size) {
  console.warn('Color audit warnings: legacy palette aliases still exist and should be migrated gradually.')
  for (const [alias, details] of legacyAliasUsage) {
    console.warn(`- ${alias}: ${details.count} files, e.g. ${details.samples.join(', ')}`)
  }
}

if (errors.length) {
  console.error('Color audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Color audit passed: ${requiredTokens.length} V7 tokens verified and ${files.length} files scanned for uncontrolled hex colors.`)
