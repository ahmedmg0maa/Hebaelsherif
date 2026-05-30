import type { MetadataRoute } from 'next'

import { ARTICLES } from '@/constants/content'
import { tryGetAdminDb } from '@/lib/firebase/admin'
import { getSafeSiteUrl } from '@/lib/runtime/site-url'

async function getPublishedEntries(
  collectionName: 'courses' | 'books',
  baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const db = tryGetAdminDb()
    if (!db) return []

    const snap = await db
      .collection(collectionName)
      .where('status', '==', 'published')
      .limit(250)
      .get()

    return snap.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as { slug?: string; updatedAt?: { toDate?: () => Date } }),
      }))
      .filter((item) => item.slug)
      .map((item) => ({
        url: `${baseUrl}/${collectionName}/${item.slug}`,
        lastModified: item.updatedAt?.toDate?.() || new Date(),
        changeFrequency: 'weekly' as const,
        priority: collectionName === 'courses' ? 0.86 : 0.82,
      }))
  } catch (error) {
    console.warn(
      `[sitemap] Skipped dynamic ${collectionName} entries:`,
      error instanceof Error ? error.message : 'unknown error',
    )
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSafeSiteUrl()
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
    changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
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
