import { BRAND, BRAND_TOKENS, COLORS } from './design'

export const BRAND_KIT = {
  name: {
    ar: BRAND.arName,
    en: BRAND.enName,
  },
  tagline: BRAND.tagline,
  positioning: 'براند عربي فاخر للكوتشنج، الوعي بالذات، الكتب، والتعلم العاطفي.',
  promise: BRAND.promise,
  credentials: BRAND.credentials,
  personality: [
    'Calm',
    'Elegant',
    'Spiritually aware without exaggeration',
    'Emotionally intelligent',
    'Trustworthy',
    'Warm',
    'Feminine but mature',
    'Deep',
    'Intentional',
    'Premium',
  ],
  archetypes: {
    primary: 'The Sage',
    secondary: 'The Caregiver',
  },
  voice: {
    characteristics: [
      'Soft but confident',
      'Calm and intentional',
      'Clear and emotionally aware',
      'Human and warm',
      'Never aggressive',
      'Never loud',
      'Never salesy',
      'No fake urgency',
    ],
    writingStyle: [
      'Short elegant Arabic sentences',
      'Emotion-first communication',
      'Calm reassurance',
      'Guided language',
      'Gentle calls-to-action',
    ],
    avoid: [
      'Hype language',
      'Cheap marketing language',
      'Corporate coldness',
      'Over-explaining',
      'Emotional manipulation',
      'Therapy/medical claims',
    ],
  },
  colors: COLORS,
  tokens: BRAND_TOKENS,
  imagery: {
    use: [
      'soft natural lighting',
      'botanical details',
      'warm paper textures',
      'teal/gold identity accents',
      'subtle Arabic ornamental lines',
      'quiet cinematic composition',
      'elegant minimal scenes',
    ],
    avoid: [
      'stock-photo energy',
      'flashy poses',
      'over-saturated colors',
      'harsh contrast',
      'pink-heavy generic coaching visuals',
      'tech startup visuals',
    ],
  },
} as const

export const IMAGE_SLOT_KEYS = [
  'home.hero',
  'home.about',
  'home.sessions',
  'home.journal',
  'about.portrait',
  'services.coaching',
  'courses.featured',
  'books.featured',
  'booking.calm-space',
  'testimonials.avatar-default',
  'og.home',
  'og.courses',
  'og.books',
  'og.booking',
] as const

export const BRAND_ASSET_REFERENCES = {
  banner: '/images/brand/og-brand.jpg',
  logoTagline: '/images/brand/logo-official.jpeg',
  logoMeaning: '/images/brand/logo-symbol.png',
  brandBoard: '/images/brand/logo-navbar.png',
  bookSilentBloom: '/images/books/book-default.jpg',
  bookJourney: '/images/books/book-default.jpg',
} as const

export type ImageSlotKey = (typeof IMAGE_SLOT_KEYS)[number]
