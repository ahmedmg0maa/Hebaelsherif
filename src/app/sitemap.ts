import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/constants/content'
import { getAdminDb } from '@/lib/firebase/admin'

async function getPublishedEntries(collectionName: 'courses' | 'books', baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const snap = await getAdminDb().collection(collectionName).where('status', '==', 'published').limit(250).get()
    return snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as { slug?: string; updatedAt?: { toDate?: () => Date } }) }))
      .filter((item) => item.slug)
      .map((item) => ({
        url: `${baseUrl}/${collectionName}/${item.slug}`,
        lastModified: item.updatedAt?.toDate?.() || new Date(),
        changeFrequency: 'weekly' as const,
        priority: collectionName === 'courses' ? 0.86 : 0.82,
      }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const staticRoutes = [
    '',
    '/start-here',
    '/services',
    '/programs',
    '/courses',
    '/books',
    '/booking',
    '/articles',
    '/faq',
    '/about',
    '/contact',
    '/trust-safety',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/session-policy',
    '/disclaimer',
    '/cookies',
  ]

  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route.includes('policy') || route.includes('terms') ? 0.45 : 0.82,
  })) satisfies MetadataRoute.Sitemap

  const articleEntries = ARTICLES.map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.72,
  })) satisfies MetadataRoute.Sitemap

  const [courseEntries, bookEntries] = await Promise.all([
    getPublishedEntries('courses', baseUrl),
    getPublishedEntries('books', baseUrl),
  ])

  return [...staticEntries, ...articleEntries, ...courseEntries, ...bookEntries]
}
