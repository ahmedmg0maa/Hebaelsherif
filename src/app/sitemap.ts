import type { MetadataRoute } from 'next'

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

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route.includes('policy') || route.includes('terms') ? 0.45 : 0.82,
  }))
}
