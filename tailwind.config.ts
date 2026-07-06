import type { Config } from 'tailwindcss'

const withOpacity = (name: string) => `rgb(var(${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: withOpacity('--color-cream'),
        ivory: withOpacity('--color-ivory'),
        'warm-beige': withOpacity('--color-warm-beige'),
        sand: withOpacity('--color-sand'),
        stone: withOpacity('--color-stone'),
        'soft-sand': withOpacity('--color-soft-sand'),
        petrol: withOpacity('--color-petrol'),
        'deep-teal': withOpacity('--color-deep-teal'),
        aqua: withOpacity('--color-aqua'),
        olive: withOpacity('--color-olive'),
        'leaf-gray': withOpacity('--color-leaf-gray'),
        gold: withOpacity('--color-gold'),
        burgundy: withOpacity('--color-burgundy'),
        'warm-gray': withOpacity('--color-warm-gray'),
        charcoal: withOpacity('--color-charcoal'),
        rose: withOpacity('--color-rose'),
        mauve: withOpacity('--color-mauve'),
        paper: withOpacity('--color-paper'),
      },
      fontFamily: {
        arabic: [
          'var(--font-arabic)',
          'Tajawal',
          'Noto Kufi Arabic',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
        serif: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        premium: '0 28px 90px rgb(var(--color-shadow) / 0.15)',
        soft: '0 18px 52px rgb(var(--color-shadow) / 0.08)',
        botanical: '0 26px 70px rgb(var(--color-petrol) / 0.12)',
        glow: '0 22px 80px rgb(var(--color-gold) / 0.16)',
        innerGold: 'inset 0 0 0 1px rgb(var(--color-gold) / 0.22)',
      },
      borderRadius: {
        premium: '1.5rem',
        botanical: '2.25rem',
      },
      maxWidth: {
        container: '1220px',
        wide: '1380px',
      },
      backgroundImage: {
        'brand-paper':
          'radial-gradient(circle at 80% 10%, rgb(var(--color-gold) / .12), transparent 24rem), radial-gradient(circle at 18% 18%, rgb(var(--color-petrol) / .08), transparent 28rem), linear-gradient(135deg, rgb(var(--color-cream)), rgb(var(--color-ivory)))',
        'teal-luxury':
          'linear-gradient(135deg, rgb(var(--color-deep-teal)), rgb(var(--color-petrol)) 58%, rgb(var(--color-aqua) / .84))',
        'gold-line': 'linear-gradient(90deg, transparent, rgb(var(--color-gold)), transparent)',
      },
      keyframes: {
        'ambient-drift': {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(1.4%,-.9%,0) scale(1.018)' },
          '100%': { transform: 'translate3d(-1.4%,1.4%,0) scale(1.035)' },
        },
        'orb-float': {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '100%': { transform: 'translate3d(14px,-18px,0) scale(1.05)' },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'ambient-drift': 'ambient-drift 24s ease-in-out infinite alternate',
        'orb-float': 'orb-float 18s ease-in-out infinite alternate',
        'reveal-up': 'reveal-up .8s ease both',
      },
    },
  },
  plugins: [],
}

export default config
