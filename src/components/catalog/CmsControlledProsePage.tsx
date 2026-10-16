import { getPublishedCmsPage } from '@/lib/data/cms'
import { ProsePage, type ProseSection } from '@/components/catalog/ProsePage'

type Fallback = { title: string; lead: string; updatedAt: string; sections: ProseSection[] }
type RecordValue = Record<string, unknown>
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []

function normalizeSection(content: unknown, index: number): ProseSection | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const value = content as RecordValue
  const heading = typeof value.heading === 'string' ? value.heading.trim() : typeof value.title === 'string' ? value.title.trim() : ''
  const body = typeof value.body === 'string' ? value.body.trim() : typeof value.text === 'string' ? value.text.trim() : ''
  const paragraphs = strings(value.paragraphs)
  if (body) paragraphs.unshift(body)
  const bullets = [...strings(value.bullets), ...strings(value.items)]
  if (!heading || paragraphs.length + bullets.length === 0) return null
  return { heading: heading || `قسم ${index + 1}`, paragraphs, ...(bullets.length ? { bullets } : {}) }
}

export async function CmsControlledProsePage({ slug, eyebrow = 'قانوني', title, lead, updatedAt, sections: fallbackSections }: { slug: string; eyebrow?: string } & Fallback) {
  const fallback = { title, lead, updatedAt, sections: fallbackSections }
  const page = await getPublishedCmsPage(slug)
  const normalized = page?.sections.map((section, index) => normalizeSection(section.content, index)).filter((section): section is ProseSection => Boolean(section)) ?? []
  if (!page || normalized.length === 0) return <ProsePage eyebrow={eyebrow} {...fallback} />
  const first = normalized[0]
  const publishedLead = first.paragraphs[0] ?? fallback.lead
  const sections = first.paragraphs.length === 1 && !first.bullets?.length ? normalized.slice(1) : normalized
  const effective = page.effectiveAt ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(`${page.effectiveAt}T12:00:00Z`)) : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(page.updatedAt))
  return <ProsePage eyebrow={eyebrow} title={page.title} lead={publishedLead} updatedAt={`${effective}${page.legalVersion ? ` · الإصدار ${page.legalVersion}` : ''}`} sections={sections.length ? sections : normalized} />
}
