import type { Metadata, Viewport } from 'next'
import GlobalExperience from '@/components/experience/GlobalExperience'
import ConversionEvents from '@/components/marketing/ConversionEvents'
import StructuredData, { buildOrganizationSchema, buildWebsiteSchema } from '@/components/seo/StructuredData'
import './globals.css'

export const dynamic = 'force-dynamic'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata: Metadata = {
  title: {
    default: 'هبة الشريف — منصة التحوّل العاطفي',
    template: '%s — هبة الشريف',
  },
  description:
    'رحلة وعي تعيدك إلى ذاتك عبر كورسات عملية، كتب رقمية، وجلسات كوتشنج فردية في مساحة عربية فاخرة وهادئة.',
  metadataBase: new URL(appUrl),
  applicationName: 'هبة الشريف',
  authors: [{ name: 'Heba ElSherif' }],
  keywords: ['هبة الشريف', 'نقطة وعي', 'كوتشنج', 'وعي بالذات', 'وعي عاطفي', 'كتب رقمية', 'جلسات فردية'],
  verification: googleVerification ? { google: googleVerification } : undefined,
  openGraph: {
    title: 'هبة الشريف — منصة التحوّل العاطفي',
    description: 'نقطة وعي عربية فاخرة للكوتشنج، الوعي بالذات، الكتب، والجلسات الهادئة.',
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
    title: 'هبة الشريف — منصة التحوّل العاطفي',
    description: 'كورسات، كتب، وجلسات فردية في تجربة عربية فاخرة وهادئة.',
    images: ['/images/brand/og-brand.jpg'],
  },
  robots: { index: true, follow: true },
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F0E7' },
    { media: '(prefers-color-scheme: dark)', color: '#0F3237' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="font-arabic bg-cream text-charcoal antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[999] focus:rounded-full focus:bg-petrol focus:px-5 focus:py-3 focus:text-sm focus:font-black focus:text-ivory">تخطي إلى المحتوى</a>
        <StructuredData data={[buildWebsiteSchema(appUrl), buildOrganizationSchema(appUrl)]} />
        <ConversionEvents />
        {children}
        <GlobalExperience />
      </body>
    </html>
  )
}
