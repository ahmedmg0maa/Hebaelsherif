import type { MetadataRoute } from 'next'

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  if (process.env.HEBA_DEPLOYMENT_ENV === 'staging') {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/checkout', '/auth'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  }
}
