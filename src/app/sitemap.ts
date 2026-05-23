import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/constants/content'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const staticRoutes = [
    '',
    '/services',
    '/courses',
    '/books',
    '/booking',
    '/about',
    '/contact',
    '/articles',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/session-policy',
    '/disclaimer',
    '/cookies',
  ]

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route.includes('articles') ? 0.75 : 0.8,
    })),
    ...ARTICLES.map((article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
