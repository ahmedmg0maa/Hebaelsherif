import type { MetadataRoute } from 'next'

import { buildAbsoluteUrl } from '@/lib/runtime/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/start-here',
          '/services',
          '/programs',
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
    sitemap: buildAbsoluteUrl('/sitemap.xml'),
  }
}
