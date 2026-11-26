export const brandColors = {
  ivory: '#EDE1CB',
  softWhite: '#F4E8D3',
  sand: '#D8C3A5',
  taupe: '#8D8173',
  khaki: '#B5A58F',
  deepTeal: '#2F6173',
  tealHover: '#274F5D',
  burgundy: '#7A2433',
  burgundySoft: '#B45A64',
  cobalt: '#2F6FA8',
  antiqueGold: '#D8C3A5',
  mutedGold: '#DCC9AB',
  ink: '#26383D',
  textSoft: '#635F58',
  border: '#DCC9AB',
} as const

export type BrandColor = keyof typeof brandColors

export const fonts = {
  heading: 'var(--font-amiri)',
  decorative: 'var(--font-aref-ruqaa)',
  body: 'var(--font-plex-arabic)',
} as const

export const radii = {
  sm: '0.375rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
} as const

export const shadows = {
  card: '0 1px 3px rgba(31, 30, 28, 0.06), 0 6px 24px rgba(31, 30, 28, 0.05)',
  cardHover: '0 2px 6px rgba(31, 30, 28, 0.08), 0 12px 36px rgba(31, 30, 28, 0.09)',
  sidebar: '-4px 0 24px rgba(14, 52, 64, 0.12)',
} as const
