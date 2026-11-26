import { existsSync } from 'node:fs'
import { read, report } from './lib.mjs'

const failures = []
const actionFile = 'src/lib/actions/admin-control.ts'
const actionSource = read(actionFile)
for (const action of ['saveProductVariant', 'deleteProductVariant', 'saveBundleChildren', 'saveOperationalSettings']) if (!actionSource.includes(`function ${action}`)) failures.push(`${actionFile}: ${action} missing`)
const manager = read('src/components/admin/ProductManager.tsx')
if (!manager.includes('ProductComposition')) failures.push('product composition UI missing')
const settings = read('src/app/admin/settings/page.tsx')
if (!settings.includes('OperationalSettingsForm')) failures.push('typed operational settings UI missing')
const checkout = read('src/components/checkout/CheckoutClient.tsx')
if (!checkout.includes('variantId') || !checkout.includes('product.variants')) failures.push('checkout variant selector missing')
if (!existsSync('supabase/migrations/025_variant_checkout.sql') || !read('supabase/migrations/025_variant_checkout.sql').includes('variant_id')) failures.push('variant-authoritative checkout migration missing')
const publication = read('src/lib/catalog/publication-readiness.ts')
if (!publication.includes('rights_status') || !publication.includes("from('course_modules')") || !publication.includes("from('book_files')") || !publication.includes("from('availability_rules')")) failures.push('catalog publication completeness gate missing')
const catalogData = read('src/lib/data/catalog.ts')
if ((catalogData.match(/products\.is_published/g) ?? []).length < 4) failures.push('published domain queries do not all require published linked products')
if (!read('src/lib/data/checkout.ts').includes('workshop.seatsReserved >= workshop.seatsTotal')) failures.push('unavailable workshop checkout denial missing')

report('audit:catalog', failures)
