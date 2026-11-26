import { readFileSync, statSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const assertions = []
const check = (condition, message) => assertions.push({ condition: Boolean(condition), message })

const fixture = read('src/lib/preview/experience.ts')
const booking = read('src/components/booking/BookingWizard.tsx')
const catalog = read('src/lib/data/catalog.ts')
const wrangler = read('wrangler.jsonc')

check(fixture.includes("process.env.HEBA_DEPLOYMENT_ENV === 'preview'"), 'Preview fixtures require the explicit preview deployment environment.')
check(fixture.includes('&& !hasSupabasePublicConfig()'), 'Preview fixtures fail closed when Supabase public configuration exists.')
check(catalog.includes('isPreviewExperienceEnabled() ? [PREVIEW_COURSE] : []'), 'The course fixture is limited to the guarded provider-free path.')
check(catalog.includes('isPreviewExperienceEnabled() ? [PREVIEW_BOOK] : []'), 'The book fixture is limited to the guarded provider-free path.')
check(booking.includes("const isPreview = experience.runtime.status === 'preview'"), 'The booking UI has an explicit Preview runtime branch.')
check(booking.indexOf('if (isPreview) {\n      setLoading(false)') < booking.indexOf('uploadPaymentProofDirect(order.orderId'), 'Preview proof completion exits before the real upload adapter.')
check(booking.includes('لم يُنشأ حجز أو طلب أو دفع'), 'The completion receipt explicitly denies real persistence.')
check(booking.includes('لا تُرفع الصورة'), 'The file step explicitly says that the selected image is not uploaded.')
check(wrangler.includes('"name": "heba-elsherif-platform-public-preview"'), 'Wrangler defines a separate public Preview Worker.')
check(wrangler.includes('"HEBA_DEPLOYMENT_ENV": "preview"'), 'The Preview Worker activates only the non-secret Preview environment flag.')

for (const path of [
  'public/images/experience/course-clarity-journey.webp',
  'public/images/experience/book-listen-inward.webp',
  'public/images/experience/journey-landscape.webp',
]) {
  const size = statSync(path).size
  check(size > 0 && size < 500_000, `${path} exists and remains below 500 KB (${size} bytes).`)
}

const failed = assertions.filter((assertion) => !assertion.condition)
for (const assertion of assertions) console.log(`${assertion.condition ? 'PASS' : 'FAIL'} ${assertion.message}`)
if (failed.length) process.exitCode = 1
else console.log(`Preview experience contract passed (${assertions.length}/${assertions.length}).`)
