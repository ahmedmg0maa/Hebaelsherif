import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
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
        ],
        disallow: ['/admin', '/dashboard', '/api', '/auth/reset-password'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
