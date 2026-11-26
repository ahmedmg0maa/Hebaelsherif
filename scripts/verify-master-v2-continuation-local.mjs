import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeOwnerProfile, ownerProfileFromForm, defaultOwnerProfile, OWNER_FIELDS } from '../src/lib/owner/profile.ts'
import { normalizeHomeMedia, homeMediaFromForm, mediaSlots } from '../src/lib/home/media.ts'
import { selectedArticleSlugs, articleSelectionFromForm } from '../src/lib/home/articles.ts'
import { completeReportRead, reportMonths } from '../src/lib/reports/integrity.ts'

const form = new FormData()
for (const [key] of OWNER_FIELDS) form.set(key, defaultOwnerProfile[key])
defaultOwnerProfile.values.forEach((v, i) => { form.set(`value_title_${i}`, v.title); form.set(`value_text_${i}`, v.text) })
assert.deepEqual(ownerProfileFromForm(form), defaultOwnerProfile)
form.set('credential_value_0', 'ACC'); form.set('credential_label_0', 'اعتماد مهني')
assert.equal(ownerProfileFromForm(form).credentials[0].verified, false)
form.set('credential_verified_0', 'on'); assert.equal(ownerProfileFromForm(form).credentials[0].verified, true)
form.set('credential_label_0', ''); assert.equal(ownerProfileFromForm(form), null)
form.set('credential_label_0', 'اعتماد مهني'); form.set('lead', '<script>bad</script>'); assert.equal(ownerProfileFromForm(form), null)
assert.deepEqual(normalizeOwnerProfile({ credentials: [{ value: 'ACC', label: 'اعتماد مهني', verified: 'true' }] }).credentials.map(c => c.verified), [false])
assert.deepEqual(normalizeOwnerProfile({ credentials: [null, 'bad', {}], values: 'bad' }).credentials, [])
assert.equal(normalizeOwnerProfile({ professionalLine: 'أ'.repeat(181) }).professionalLine, defaultOwnerProfile.professionalLine)

const assetId = '11111111-1111-4111-8111-111111111111'
const media = { main: { assetId, alt: 'صورة لاختبار الوصف', x: 0, y: 100 } }
assert.deepEqual(normalizeHomeMedia(media), media)
for (const invalid of [{ assetId: 'not-a-uuid' }, { alt: '' }, { alt: '<svg>' }, { x: -1 }, { y: 101 }, { x: NaN }, { x: '50' }]) assert.deepEqual(normalizeHomeMedia({ main: { ...media.main, ...invalid } }), {})
assert.deepEqual(normalizeHomeMedia({ secret: media.main }), {})
assert.equal(mediaSlots('pathways', 1e9).length, 3)
const mediaForm = new FormData()
mediaForm.set('media_main_id', assetId); mediaForm.set('media_main_alt', media.main.alt); mediaForm.set('media_main_x', '0'); mediaForm.set('media_main_y', '100')
assert.deepEqual(homeMediaFromForm('hero', mediaForm), media)
mediaForm.set('media_main_y', 'Infinity'); assert.equal(homeMediaFromForm('hero', mediaForm), null)

assert.deepEqual(selectedArticleSlugs(['first-article', 'second-article', 'first-article', '//bad']), ['first-article', 'second-article'])
const articles = new FormData(); articles.set('article_slug_0', 'first-article'); articles.set('article_slug_1', 'first-article')
assert.equal(articleSelectionFromForm(articles), null)
articles.set('article_slug_1', 'second-article'); assert.deepEqual(articleSelectionFromForm(articles), ['first-article', 'second-article'])
assert.deepEqual(articleSelectionFromForm(new FormData()), [])

assert.equal(completeReportRead({ data: [1, 2], count: 3, error: null }), false)
assert.equal(completeReportRead({ data: [1], count: null, error: null }), false)
assert.equal(completeReportRead({ data: [], count: 0, error: null }), true)
assert.equal(completeReportRead({ data: [], count: 0, error: new Error('unavailable') }), false)
for (const value of ['1', '3', '6', '12']) assert.equal(reportMonths(value), Number(value))
for (const value of ['0', '99', '1e1', null, [], {}]) assert.equal(reportMonths(value), 12)

const read = path => readFileSync(path, 'utf8')
const owner = read('supabase/migrations/083_owner_profile_governance_local_only.sql')
for (const token of ["has_permission('content.manage'", 'pg_advisory_xact_lock', 'for update', 'public.site_setting_revisions', 'public.content_revisions', 'public.audit_logs', 'from public,anon,authenticated', 'to service_role']) assert.ok(owner.includes(token), token)
const binding = read('supabase/migrations/084_home_media_binding_local_only.sql')
for (const token of ['home_media_rights_required', 'home_media_crop_invalid', 'for share', 'home_section_media_binding', 'public.media_usages', "v_usage.entity_type='page_section'", "has_permission('content.manage',p_actor_id)", 'public.content_revisions']) assert.ok(binding.includes(token), token)
const cms = read('src/lib/actions/cms.ts')
assert.ok(cms.includes("rpc('manage_owner_profile'"))
assert.ok(cms.includes('Object.keys(media).length ? { media }'))
assert.ok(!read('src/app/admin/settings/page.tsx').includes('HomeCopyEditor'))
assert.ok(read('src/components/home/Hero.tsx').includes('profile.professionalLine'))
assert.ok(read('src/components/home/TrustStrip.tsx').includes('item.verified'))
assert.ok(read('src/lib/data/home.ts').includes(".eq('status', 'published').in('slug', selected)"))
assert.ok(read('supabase/migrations/085_home_featured_articles_local_only.sql').includes('home_article_not_published'))
assert.ok(read('src/components/booking/BookingWizard.tsx').includes('finally { actionLock.current = false; setLoading(false) }'))
assert.ok(read('src/components/checkout/CheckoutClient.tsx').includes('checkoutRequestId ?? crypto.randomUUID()'))
assert.ok(read('src/components/ui/Sidebar.tsx').includes('element.showModal()'))
assert.ok(!read('src/components/ui/Sidebar.tsx').includes('BotanicalSpray'))
assert.ok(read('src/lib/data/reports.ts').includes('!completeReportRead(result)'))
console.log('Master V2 continuation: owner/media/article/report behavior and security source contracts passed. No database or browser execution claimed.')
