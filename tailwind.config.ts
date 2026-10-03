import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#090719',
        panel: '#120F2B',
        panel2: '#1A1640',
        line: '#2B2658',
        violet: { DEFAULT: '#8B6CFF', soft: '#B7A6FF', deep: '#5B3FD9' },
        azure: { DEFAULT: '#4C9AFF', soft: '#9CC6FF' },
        ink: '#EEEBFF',
        muted: '#9B96C7',
        dim: '#6C6796',
        gold: { DEFAULT: '#F4C95D', deep: '#B8902C' },
        danger: '#FF6B8B',
      },
      fontFamily: {
        display: ['"Unbounded Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,108,255,0.35), 0 0 28px -6px rgba(139,108,255,0.45)',
        goldglow: '0 0 0 1px rgba(244,201,93,0.55), 0 0 40px -8px rgba(244,201,93,0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
