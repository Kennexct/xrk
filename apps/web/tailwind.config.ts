import type { Config } from 'tailwindcss';

// Mobile-first (master.md §4): bottom nav ≤767px, collapsible sidebar 768–1279px,
// fixed sidebar ≥1280px — matches Tailwind's md/xl defaults.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sun: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
      },
    },
  },
  plugins: [],
};

export default config;
