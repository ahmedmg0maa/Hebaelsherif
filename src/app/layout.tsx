import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'هبة الشريف — منصة التحوّل العاطفي',
    template: '%s — هبة الشريف',
  },
  description:
    'منصة عربية فاخرة للتحوّل العاطفي والنمو الشخصي من خلال الدورات، الكتب، والجلسات الفردية.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'هبة الشريف — منصة التحوّل العاطفي',
    description:
      'رحلة عربية هادئة وعميقة نحو الوعي العاطفي، العلاقات الصحية، والنمو الشخصي.',
    locale: 'ar_EG',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} font-arabic bg-cream text-charcoal antialiased`}>
        {children}
      </body>
    </html>
  )
}