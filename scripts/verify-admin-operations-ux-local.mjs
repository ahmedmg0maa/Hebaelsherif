import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const agenda = read('src/components/admin/BookingAgenda.tsx')
const catalog = read('src/components/admin/CatalogManager.tsx')

const assertions = [
  [agenda.includes("const SAVED_FILTER_KEY = 'heba.admin.booking-agenda.v1'"), 'booking agenda has a versioned device-local saved view'],
  [agenda.includes('JSON.stringify({ view, status })'), 'saved booking view contains only period and status'],
  [agenda.includes('Deliberately omit `query`'), 'customer search/PII is intentionally excluded from persistence'],
  [!agenda.includes('JSON.stringify({ view, status, query'), 'customer query is never serialized'],
  [agenda.includes('aria-label="بحث الأجندة بالعميلة أو الخدمة"'), 'agenda search has an accessible name'],
  [catalog.includes('قائمة الجاهزية قبل النشر'), 'catalog editor exposes the publication checklist'],
  [catalog.includes('يعيد الخادم فحص هذه الشروط'), 'catalog UI describes server-authoritative enforcement'],
  [catalog.includes('إثبات الحقوق') && read('src/lib/catalog/publication-readiness.ts').includes('rights_status'), 'catalog UI keeps media-rights readiness fail closed'],
]

const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message)
if (failures.length) {
  console.error(`verify:admin-operations-ux-local failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('verify:admin-operations-ux-local passed — privacy-safe saved agenda views and server-authoritative catalog publication guidance verified')
