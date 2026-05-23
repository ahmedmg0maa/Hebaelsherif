import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/constants/content'

export default function sitemap(): MetadataRoute.Sitemap {
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
    changeFrequency: 'monthly',
    priority: 0.72,
  })) satisfies MetadataRoute.Sitemap

  return [...staticEntries, ...articleEntries]
}
