import type { MetadataRoute } from 'next'

// Installable web app (add-to-home-screen on Android/iOS).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'هبة الشريف — منصة التعلّم والتطوير',
    short_name: 'هبة الشريف',
    description: 'دورات، كتب، ورش عمل، وجلسات فردية لرحلة تطوّر واعية.',
    dir: 'rtl',
    lang: 'ar',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2EADF',
    theme_color: '#0E3440',
    icons: [
      {
        src: '/brand/main-logo.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
