import {
  listArticles,
  listBooks,
  listCourses,
  listServices,
  listWorkshops,
} from '@/lib/data/catalog'
import { listPublishedResources } from '@/lib/data/resources'
import { listPublishedPrograms } from '@/lib/data/programs'
import { normalizeArabicSearch } from './normalize'

export type PublicSearchKind = 'course' | 'book' | 'workshop' | 'service' | 'article' | 'resource' | 'program'
export type PublicSearchItem = {
  kind: PublicSearchKind
  title: string
  summary: string
  href: string
  searchText: string
}

export function rankPublicSearch(items: PublicSearchItem[], rawQuery: string, limit = 24) {
  const query = normalizeArabicSearch(rawQuery)
  if (query.length < 2) return []
  const tokens = query.split(' ').filter((token) => token.length > 1)
  if (!tokens.length) return []

  return items
    .map((item) => {
      const title = normalizeArabicSearch(item.title)
      const haystack = normalizeArabicSearch(`${item.title} ${item.searchText}`)
      if (!tokens.every((token) => haystack.includes(token))) return null
      const score = title === query ? 100 : title.startsWith(query) ? 70 : title.includes(query) ? 50 : tokens.reduce((sum, token) => sum + (title.includes(token) ? 10 : 2), 0)
      return { item, score }
    })
    .filter((entry): entry is { item: PublicSearchItem; score: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ar'))
    .slice(0, Math.max(1, Math.min(limit, 24)))
    .map(({ item }) => item)
}

export async function searchPublishedContent(rawQuery: string) {
  const query = normalizeArabicSearch(rawQuery)
  if (query.length < 2) return { query, results: [] as PublicSearchItem[] }

  const [courses, books, workshops, services, articles, resources, programs] = await Promise.all([
    listCourses(),
    listBooks(),
    listWorkshops(),
    listServices(),
    listArticles(),
    listPublishedResources({ limit: 60 }),
    listPublishedPrograms(),
  ])

  const items: PublicSearchItem[] = [
    ...courses.map((item) => ({ kind: 'course' as const, title: item.title, summary: item.subtitle || item.description, href: `/courses/${item.slug}`, searchText: `${item.subtitle} ${item.description} ${item.level}` })),
    ...books.map((item) => ({ kind: 'book' as const, title: item.title, summary: item.subtitle || item.description, href: `/books/${item.slug}`, searchText: `${item.subtitle} ${item.description}` })),
    ...workshops.map((item) => ({ kind: 'workshop' as const, title: item.title, summary: item.subtitle || item.description, href: `/workshops/${item.slug}`, searchText: `${item.subtitle} ${item.description}` })),
    ...services.map((item) => ({ kind: 'service' as const, title: item.title, summary: item.subtitle || item.description, href: `/booking?service=${encodeURIComponent(item.slug)}`, searchText: `${item.subtitle} ${item.description}` })),
    ...articles.map((item) => ({ kind: 'article' as const, title: item.title, summary: item.excerpt, href: `/articles/${item.slug}`, searchText: item.excerpt })),
    ...resources.map((item) => ({ kind: 'resource' as const, title: item.title, summary: item.excerpt, href: `/resources/${item.slug}`, searchText: `${item.excerpt} ${item.topic} ${item.transcript.slice(0, 1000)}` })),
    ...programs.map((item) => ({ kind: 'program' as const, title: item.title, summary: item.subtitle || item.description, href: `/programs/${item.slug}`, searchText: `${item.subtitle} ${item.description} ${item.type}` })),
  ]

  return { query, results: rankPublicSearch(items, query) }
}
