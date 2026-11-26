import type { MetadataRoute } from 'next'
import { listCourses, listBooks, listWorkshops, listArticles } from '@/lib/data/catalog'
import { listPublishedResources } from '@/lib/data/resources'
import { listPublishedPrograms } from '@/lib/data/programs'

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '',
    '/about',
    '/start-here',
    '/services',
    '/booking',
    '/books',
    '/courses',
    '/workshops',
    '/articles',
    '/testimonials',
    '/press',
    '/resources',
    '/programs',
    '/contact',
    '/faq',
  ].map((path) => ({
    url: `${site}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }))

  const [courses, books, workshops, articles, resources, programs] = await Promise.all([
    listCourses(),
    listBooks(),
    listWorkshops(),
    listArticles(),
    listPublishedResources({ limit: 100 }),
    listPublishedPrograms(),
  ])

  return [
    ...staticRoutes,
    ...courses.map((c) => ({ url: `${site}/courses/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...books.map((b) => ({ url: `${site}/books/${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...workshops.map((w) => ({ url: `${site}/workshops/${w.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${site}/articles/${a.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...resources.map((resource) => ({ url: `${site}/resources/${resource.slug}`, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...programs.map((program) => ({ url: `${site}/programs/${program.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ]
}
