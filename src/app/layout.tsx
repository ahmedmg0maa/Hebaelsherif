import type { Metadata, Viewport } from 'next'
import GlobalExperience from '@/components/experience/GlobalExperience'
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
    'منصة عربية فاخرة للتحوّل العاطفي والنمو الشخصي من خلال الدورات، الكتب، والجلسات الفردية.',
  metadataBase: new URL(appUrl),
  applicationName: 'هبة الشريف',
  authors: [{ name: 'Heba ElSherif' }],
  keywords: ['هبة الشريف', 'كوتشنج', 'دورات نفسية', 'وعي عاطفي', 'كتب رقمية', 'جلسات فردية'],
  verification: googleVerification ? { google: googleVerification } : undefined,
  openGraph: {
    title: 'هبة الشريف — منصة التحوّل العاطفي',
    description: 'رحلة عربية هادئة وعميقة نحو الوعي العاطفي، العلاقات الصحية، والنمو الشخصي.',
    url: appUrl,
    siteName: 'هبة الشريف',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'هبة الشريف — منصة التحوّل العاطفي',
    description: 'دورات، كتب، وجلسات فردية في تجربة عربية فاخرة.',
  },
  robots: { index: true, follow: true },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF4EE' },
    { media: '(prefers-color-scheme: dark)', color: '#181418' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="font-arabic bg-cream text-charcoal antialiased">
        {children}
        <GlobalExperience />
      </body>
    </html>
  )
}
