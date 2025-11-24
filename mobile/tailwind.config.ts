import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #16a34a)',
      },
      boxShadow: {
        card: '0 6px 18px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
