import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #2563eb)',
      },
      maxWidth: {
        mobile: '600px',
      },
    },
  },
  plugins: [],
};

export default config;
