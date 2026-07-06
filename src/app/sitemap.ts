import type { MetadataRoute } from 'next'

import { ARTICLES } from '@/constants/content'
import { getSafeSiteUrl } from '@/lib/runtime/site-url'

export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticEntries, ...articleEntries]
}
