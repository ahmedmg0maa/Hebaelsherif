'use server'

import { revalidatePath } from 'next/cache'
import { FRESH_ADMIN_ASSURANCE_ERROR, requireFreshAdminAssurance } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }
type RecordValue = Record<string, unknown>
const SECTION_KINDS = new Set(['hero','intro','trust','pathways','guided_start','editorial_feature','featured_services','books','courses','workshops','availability_preview','offer','testimonials','press','articles','resources','newsletter','cta','rich_text'])

const object = (value: unknown): RecordValue | null => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
const safeOptionalUrl = (value: unknown) => value == null || value === '' || typeof value === 'string' && (value.startsWith('/') && !value.startsWith('//') || /^https:\/\/[^\s]+$/i.test(value))
function safeSectionContent(value: unknown) {
  const root = object(value)
  if (!root) return false
  const pending: unknown[] = [root]
  while (pending.length) {
    const item = pending.pop()
    if (Array.isArray(item)) { pending.push(...item); continue }
    const row = object(item)
    if (!row) continue
    for (const [key, child] of Object.entries(row)) {
      if (typeof child === 'string' && /(href|url|link)$/i.test(key) && child && !safeOptionalUrl(child)) return false
      if (typeof child === 'object' && child) pending.push(child)
    }
  }
  return true
}

async function rollback(table: string, id: string, previous: RecordValue) {
  await getServiceClient().from(table).update(previous).eq('id', id)
}

export async function restoreContentRevision(revisionId: string): Promise<Result> {
  const context = await requireFreshAdminAssurance('content.publish')
  if (!context?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  if (!/^[0-9a-f-]{36}$/i.test(revisionId)) return { ok: false, error: 'معرّف المراجعة غير صالح.' }
  const service = getServiceClient()
  const { data: revision, error: revisionError } = await service.from('content_revisions').select('id,entity_type,entity_id,snapshot').eq('id', revisionId).maybeSingle()
  if (revisionError || !revision || !['page','page_section','article'].includes(revision.entity_type)) return { ok: false, error: 'هذه المراجعة غير قابلة للاستعادة من الواجهة الآمنة.' }
  const snapshot = object(revision.snapshot)
  if (!snapshot) return { ok: false, error: 'نسخة المراجعة غير صالحة.' }

  const table = revision.entity_type === 'page' ? 'pages' : revision.entity_type === 'article' ? 'articles' : 'page_sections'
  const { data: current, error: currentError } = await service.from(table).select('*').eq('id', revision.entity_id).maybeSingle()
  if (currentError || !current) return { ok: false, error: 'السجل الأصلي غير موجود؛ الاستعادة التلقائية للسجل المحذوف غير مسموحة.' }
  let payload: RecordValue
  let publicPath = '/'

  if (revision.entity_type === 'page') {
    const title = String(snapshot.title ?? '').trim()
    if (title.length < 3 || !safeOptionalUrl(snapshot.canonical_url) || !safeOptionalUrl(snapshot.og_image_url)) return { ok: false, error: 'محتوى مراجعة الصفحة لا يجتاز التحقق الحالي.' }
    const legalReviewStatus = String(snapshot.legal_review_status ?? 'not_applicable')
    payload = {
      title,
      seo_title: typeof snapshot.seo_title === 'string' ? snapshot.seo_title.slice(0, 180) : null,
      seo_description: typeof snapshot.seo_description === 'string' ? snapshot.seo_description.slice(0, 320) : null,
      canonical_url: snapshot.canonical_url || null,
      og_image_url: snapshot.og_image_url || null,
      status: 'draft', is_published: false, publish_at: null,
      legal_review_status: legalReviewStatus === 'approved' ? 'pending' : ['not_applicable','draft','pending'].includes(legalReviewStatus) ? legalReviewStatus : 'not_applicable',
      legal_version: snapshot.legal_version ?? null,
      effective_at: snapshot.effective_at ?? null,
      revision: Number(current.revision ?? 1) + 1,
    }
    publicPath = `/${String(current.slug ?? '')}`
  } else if (revision.entity_type === 'article') {
    const title = String(snapshot.title ?? '').trim()
    const slug = String(snapshot.slug ?? '').trim()
    if (title.length < 3 || !/^[a-z0-9-]{3,80}$/.test(slug) || !safeOptionalUrl(snapshot.canonical_url) || !safeOptionalUrl(snapshot.og_image_url)) return { ok: false, error: 'محتوى مراجعة المقال لا يجتاز التحقق الحالي.' }
    payload = {
      title, slug,
      excerpt: String(snapshot.excerpt ?? '').slice(0, 500),
      content: String(snapshot.content ?? '').slice(0, 200_000),
      cover_url: safeOptionalUrl(snapshot.cover_url) ? snapshot.cover_url ?? null : null,
      canonical_url: snapshot.canonical_url || null,
      og_image_url: snapshot.og_image_url || null,
      status: 'draft', is_published: false, publish_at: null,
    }
    publicPath = `/articles/${slug}`
  } else {
    const name = String(snapshot.name ?? '').trim()
    const kind = String(snapshot.kind ?? '')
    const content = snapshot.content
    const sort = Number(snapshot.sort ?? 0)
    if (name.length < 2 || !SECTION_KINDS.has(kind) || !Number.isInteger(sort) || sort < 0 || sort > 1000 || !safeSectionContent(content)) return { ok: false, error: 'محتوى مراجعة القسم لا يجتاز التحقق الحالي.' }
    payload = { name, kind, content, sort, is_visible: false, revision: Number(current.revision ?? 1) + 1 }
  }

  const { error: checkpointError } = await service.from('content_revisions').insert({ entity_type: revision.entity_type, entity_id: revision.entity_id, snapshot: current, created_by: context.userId })
  if (checkpointError) return { ok: false, error: 'تعذّر حفظ نقطة رجوع جديدة؛ لم تتغير البيانات.' }
  const { error: updateError } = await service.from(table).update(payload).eq('id', revision.entity_id)
  if (updateError) return { ok: false, error: 'تعذّرت الاستعادة؛ لم تُنشر أي نسخة.' }
  const { error: auditError } = await service.from('audit_logs').insert({ actor_id: context.userId, action: 'content_revision.restored_as_draft', entity_type: revision.entity_type, entity_id: revision.entity_id, meta: { revision_id: revision.id } })
  if (auditError) {
    await rollback(table, revision.entity_id, current)
    return { ok: false, error: 'تعذّر تسجيل التدقيق؛ أُعيد السجل إلى حالته السابقة.' }
  }
  revalidatePath('/admin/revisions')
  revalidatePath('/admin/pages')
  revalidatePath('/admin/articles')
  revalidatePath(publicPath)
  return { ok: true }
}
