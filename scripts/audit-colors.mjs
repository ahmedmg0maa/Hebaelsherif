import { walk, read, report } from './lib.mjs'

// Forbid generic Tailwind palette colors — brand tokens only (§3).
const genericPalettes =
  '(red|orange|amber|yellow|lime|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|teal)'
const rx = new RegExp(`\\b(bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide)-${genericPalettes}-\\d{2,3}\\b`, 'g')

const files = walk('src', ['.tsx', '.ts', '.css'])
const failures = []

for (const f of files) {
  const src = read(f)
  const matches = src.match(rx)
  if (matches) failures.push(`${f}: generic Tailwind colors ${[...new Set(matches)].join(', ')}`)
}

report('audit:colors', failures)
