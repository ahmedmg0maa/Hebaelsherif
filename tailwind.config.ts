import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E7',
        petrol: '#2F6173',
        olive: '#6B724E',
        gold: '#B79B6C',
        burgundy: '#7A2433',
        ivory: '#FAF7F2',
        sand: '#E9E0D2',
        stone: '#C8C1B6',
        'warm-gray': '#8A837B',
        charcoal: '#2A2A2A',
      },
      fontFamily: {
        arabic: ['var(--font-tajawal)', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 24px 80px rgba(42, 42, 42, 0.08)',
        soft: '0 18px 50px rgba(42, 42, 42, 0.06)',
      },
      borderRadius: {
        premium: '1.5rem',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
}

export default config