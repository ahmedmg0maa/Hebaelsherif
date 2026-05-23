export const BRAND_KIT = {
  name: {
    ar: 'هبة الشريف',
    en: 'Heba ElSherif',
  },
  positioning: 'منصة عربية فاخرة للتعلم العاطفي والجلسات الهادئة.',
  promise:
    'A calm premium digital space that helps women gain emotional clarity, self-understanding, and personal transformation through guided learning, books, and coaching.',
  personality: [
    'Calm',
    'Elegant',
    'Emotionally intelligent',
    'Trustworthy',
    'Warm',
    'Feminine but mature',
    'Deep',
    'Intentional',
    'Minimal',
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
      'Never motivational guru energy',
    ],
    writingStyle: [
      'Short elegant sentences',
      'Emotion-first communication',
      'Calm reassurance',
      'Guided language',
      'Gentle calls-to-action',
    ],
    avoid: [
      'Hype language',
      'Fake urgency',
      'Cheap marketing language',
      'Corporate coldness',
      'Over-explaining',
      'Emotional manipulation',
    ],
  },
  colors: {
    warmCream: '#F5F0E7',
    petrolBlue: '#2F6173',
    softOlive: '#6B724E',
    mutedGold: '#B79B6C',
    agedBurgundy: '#7A2433',
    softIvory: '#FAF7F2',
    lightSand: '#E9E0D2',
    mutedStone: '#C8C1B6',
    warmGray: '#8A837B',
    deepCharcoal: '#2A2A2A',
  },
  imagery: {
    use: [
      'soft natural lighting',
      'cinematic composition',
      'neutral warm colors',
      'emotional realism',
      'elegant minimal scenes',
    ],
    avoid: [
      'stock-photo energy',
      'flashy poses',
      'over-saturated colors',
      'harsh contrast',
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

export type ImageSlotKey = (typeof IMAGE_SLOT_KEYS)[number]
