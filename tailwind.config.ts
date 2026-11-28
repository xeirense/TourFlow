import type { Config } from 'tailwindcss';

// TourFlow palette — black, white, silver + one calm, trustworthy blue.
//  ink    → near-black for text, primary dark surfaces
//  slate  → silver/grey neutrals (Tailwind default, kept)
//  brand  → the single accent colour (buttons, links, active states)
//  red    → only for destructive actions and errors
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0B0F17',
          soft:    '#151B26',
        },
        brand: {
          50:  '#F2F5FE',
          100: '#E3EAFC',
          200: '#C8D5F9',
          300: '#A1B7F3',
          400: '#6F8EEA',
          500: '#4A6DE0',
          600: '#2F54D1',
          700: '#2643AE',
          800: '#23398C',
          900: '#1F326F',
          950: '#141F45',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 15, 23, 0.04), 0 1px 3px rgba(11, 15, 23, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
