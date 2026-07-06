import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import GlobalExperience from '@/components/experience/GlobalExperience'
import ConversionEvents from '@/components/marketing/ConversionEvents'
import StructuredData, {
  buildOrganizationSchema,
  buildWebsiteSchema,
} from '@/components/seo/StructuredData'
import { cleanOptionalEnvValue, getSafeSiteUrl } from '@/lib/runtime/site-url'

import './globals.css'


export const dynamic = 'force-dynamic'

const appUrl = getSafeSiteUrl()
const googleVerification = cleanOptionalEnvValue(
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
)

export const metadata: Metadata = {
  title: {
    default: 'هبة الشريف — رحلة وعي تعيدك إلى ذاتك',
    template: '%s — هبة الشريف',
  },
  description:
    'منصة عربية فاخرة لهبة الشريف تجمع بين الجلسات الفردية، المسارات التعليمية، الكتب الرقمية، وتجربة وعي هادئة تعيدك إلى ذاتك.',
  metadataBase: new URL(appUrl),
  applicationName: 'هبة الشريف',
  authors: [{ name: 'Heba ElSherif' }],
  creator: 'Heba ElSherif',
  publisher: 'Heba ElSherif',
  keywords: [
    'هبة الشريف',
    'رحلة وعي',
    'وعي ذاتي',
    'وعي عاطفي',
    'جلسات فردية',
    'كوتشنج',
    'كتب رقمية',
    'مسارات تعليمية',
  ],
  verification: googleVerification ? { google: googleVerification } : undefined,
  openGraph: {
    title: 'هبة الشريف — رحلة وعي تعيدك إلى ذاتك',
    description:
      'جلسات فردية، مسارات تعليمية، كتب رقمية، ومحتوى عربي هادئ يساعدك على فهم ذاتك بخطوات أوضح.',
    url: appUrl,
    siteName: 'هبة الشريف',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/images/brand/og-brand.jpg',
        width: 1200,
        height: 630,
        alt: 'هبة الشريف — رحلة وعي تعيدك إلى ذاتك',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'هبة الشريف — رحلة وعي تعيدك إلى ذاتك',
    description:
      'جلسات فردية، مسارات تعليمية، وكتب رقمية في تجربة عربية فاخرة وهادئة.',
    images: ['/images/brand/og-brand.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2EA' },
    { media: '(prefers-color-scheme: dark)', color: '#0E3440' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="font-arabic bg-cream text-charcoal antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[999] focus:rounded-full focus:bg-petrol focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-ivory"
        >
          تخطي إلى المحتوى
        </a>

        <StructuredData
          data={[buildWebsiteSchema(appUrl), buildOrganizationSchema(appUrl)]}
        />

        <ConversionEvents />

        {children}

        <GlobalExperience />
      </body>
    </html>
  )
}
