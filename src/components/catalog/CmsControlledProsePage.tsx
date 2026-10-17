import {normalizeCmsProse} from '@/lib/cms/prose'
import { getPublishedCmsPage } from '@/lib/data/cms'
import { ProsePage, type ProseSection } from '@/components/catalog/ProsePage'

type Fallback = { title: string; lead: string; updatedAt: string; sections: ProseSection[] }
export async function CmsControlledProsePage({ slug, eyebrow = 'قانوني', title, lead, updatedAt, sections: fallbackSections }: { slug: string; eyebrow?: string } & Fallback) {
  const fallback = { title, lead, updatedAt, sections: fallbackSections }
  const page = await getPublishedCmsPage(slug)
  const normalized = page?.sections.map(section => normalizeCmsProse(section.content)).filter((section): section is ProseSection => Boolean(section)) ?? []
  if (!page || normalized.length === 0) return <ProsePage eyebrow={eyebrow} {...fallback} />
  const first = normalized[0]
  const publishedLead = first.paragraphs[0] ?? fallback.lead
  const sections = first.paragraphs.length === 1 && !first.bullets?.length ? normalized.slice(1) : normalized
  const effective = page.effectiveAt ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(`${page.effectiveAt}T12:00:00Z`)) : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(page.updatedAt))
  return <ProsePage eyebrow={eyebrow} title={page.title} lead={publishedLead} updatedAt={`${effective}${page.legalVersion ? ` · الإصدار ${page.legalVersion}` : ''}`} sections={sections.length ? sections : normalized} />
}
