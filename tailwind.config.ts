import type { Config } from 'tailwindcss'

const withOpacity = (name: string) => `rgb(var(${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: withOpacity('--color-cream'),
        petrol: withOpacity('--color-petrol'),
        olive: withOpacity('--color-olive'),
        gold: withOpacity('--color-gold'),
        burgundy: withOpacity('--color-burgundy'),
        ivory: withOpacity('--color-ivory'),
        sand: withOpacity('--color-sand'),
        stone: withOpacity('--color-stone'),
        'warm-gray': withOpacity('--color-warm-gray'),
        charcoal: withOpacity('--color-charcoal'),
        rose: withOpacity('--color-rose'),
        mauve: withOpacity('--color-mauve'),
      },
      fontFamily: {
        arabic: ['var(--font-tajawal)', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 24px 80px rgb(var(--color-shadow) / 0.13)',
        soft: '0 18px 50px rgb(var(--color-shadow) / 0.08)',
        glow: '0 20px 70px rgb(var(--color-burgundy) / 0.12)',
      },
      borderRadius: {
        premium: '1.5rem',
      },
      maxWidth: {
        container: '1220px',
      },
    },
  },
  plugins: [],
}

export default config
