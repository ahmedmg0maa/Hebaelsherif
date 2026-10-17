import { resolveHomeMedia } from '@/lib/data/home-media'
import { createHash } from 'node:crypto'
import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase/server'
import {ProsePage} from '@/components/catalog/ProsePage'
import {normalizeCmsProse,type CmsProseSection} from '@/lib/cms/prose'
import { normalizeHomeSections } from '@/lib/home/sections'
import { getHomeCopy, getOwnerProfile } from '@/lib/data/cms'
import { getHomeData } from '@/lib/data/home'
import { HomeSectionRenderer } from '@/components/home/HomeSectionRenderer'
import { getPublishedGuidedAssessment } from '@/lib/data/assessments'

type Props = { params: Promise<{ type: string; id: string }>; searchParams: Promise<{ token?: string; viewport?: string }> }

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false, noarchive: true } }

export default async function ContentPreviewPage({ params, searchParams }: Props) {
  const { type, id } = await params
  const { token, viewport } = await searchParams
  if (!token || !['page', 'article'].includes(type)) notFound()

  const service = getServiceClient()
  const hash = createHash('sha256').update(token).digest('hex')
  const { data: grantId, error: grantError } = await service.rpc('consume_content_preview_token', {
    p_entity_type: type,
    p_entity_id: id,
    p_token_hash: hash,
  })
  if (grantError || !grantId) notFound()

  const previewLabel = viewport === 'mobile' ? 'هاتف 390px' : viewport === 'tablet' ? 'لوحي 768px' : 'سطح مكتب'
  if (type === 'article') {
    const { data } = await service.from('articles').select('title,excerpt,content').eq('id', id).maybeSingle()
    if (!data) notFound()
    return <main className="mx-auto max-w-3xl px-6 py-12"><p className="mb-4 rounded-full bg-antique-gold/15 px-4 py-2 text-center text-sm font-bold text-deep-teal">معاينة خاصة — ليست منشورة · {previewLabel}</p><h1 className="text-4xl font-bold text-deep-teal">{data.title}</h1><p className="mt-4 text-lg text-text-soft">{data.excerpt}</p><article className="mt-8 whitespace-pre-wrap leading-loose text-ink">{data.content}</article></main>
  }

  const { data: page } = await service.from('pages').select('slug,title,page_sections(id,name,kind,sort,is_visible,content)').eq('id', id).maybeSingle()
  if (!page) notFound()
  if (page.slug === 'home') {
    const [copy, data, assessment, profile] = await Promise.all([getHomeCopy(), getHomeData(), getPublishedGuidedAssessment(), getOwnerProfile()])
    const sections = await resolveHomeMedia(normalizeHomeSections(page.page_sections, false))
    return <main><p className="sticky top-0 z-60 bg-burgundy px-4 py-2 text-center text-sm font-bold text-on-dark">معاينة خاصة — ليست منشورة ولا قابلة للفهرسة · {previewLabel}</p>{sections.map((section) => <HomeSectionRenderer key={section.id} section={section} copy={copy} data={data} profile={profile} assessment={assessment} preview />)}</main>
  }

  const sections=page.page_sections.filter(s=>s.is_visible).sort((a,b)=>a.sort-b.sort).map(s=>normalizeCmsProse(s.content)).filter((s):s is CmsProseSection=>Boolean(s))
  return <div><p className="bg-antique-gold/15 px-4 py-3 text-center text-sm font-bold text-deep-teal">معاينة خاصة — ليست منشورة · {previewLabel} · الأقسام الظاهرة فقط</p><ProsePage eyebrow="معاينة الصفحة" title={page.title} lead="" sections={sections}/></div>
}
