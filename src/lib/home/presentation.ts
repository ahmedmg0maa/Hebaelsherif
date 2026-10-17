// Shared by the renderer and the draft baseline: do not silently replace art.
export const HOME_PRESENTATION = {
  heroImage: { url: '/images/learning/learning-desk.webp', alt: 'مساحة تعلّم دافئة؛ دفتر وكتب ودرس على الحاسوب', x: 50, y: 50 },
  readingImage: {url:'/brand/books-reading-v2.webp',alt:'كتب ودفتر للقراءة والتأمل',x:50,y:50},
  heroLinks: { primary: '/start-here', secondary: '/booking' },
  portalImages: {
    '/booking': '/brand/catalog-still-life.webp', '/services': '/brand/catalog-still-life.webp',
    '/books': '/brand/books-reading-v2.webp', '/courses': '/images/learning/learning-desk.webp',
    '/workshops': '/brand/catalog-still-life.webp',
  } as Record<string, string>,
} as const
