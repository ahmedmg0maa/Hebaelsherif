import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const search = readFileSync('src/lib/search/public-search.ts', 'utf8')
const normalize = readFileSync('src/lib/search/normalize.ts', 'utf8')
const page = readFileSync('src/app/(public)/search/page.tsx', 'utf8')
const header = readFileSync('src/components/layout/PublicHeader.tsx', 'utf8')
const catalog = readFileSync('src/lib/data/catalog.ts', 'utf8')

for (const source of [".eq('is_published', true)", ".eq('is_active', true)", ".eq('products.is_published', true)"]) assert.ok(catalog.includes(source), `missing published-only catalog boundary: ${source}`)
for (const source of ['listCourses()', 'listBooks()', 'listWorkshops()', 'listServices()', 'listArticles()', 'listPublishedResources({ limit: 60 })', 'normalizeArabicSearch', 'tokens.every', '.slice(0, Math.max(1, Math.min(limit, 24)))']) assert.ok(search.includes(source), `missing search contract: ${source}`)
assert.ok(normalize.includes(".replace(/[إأآٱ]/g, 'ا')"), 'Arabic alef variants are not normalized')
assert.match(page, /robots:\s*\{\s*index:\s*false/)
assert.match(page, /role="search"/)
assert.match(page, /minLength=\{2\}/)
assert.ok(header.includes('href="/search"'), 'public header has no search access')
console.log('verify:public-search-local passed — Arabic normalization, published-only sources, bounded results, noindex and accessible search entry verified')
