import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1F8A70'
      },
      maxWidth: {
        phone: '600px'
      }
    }
  },
  plugins: []
};

export default config;
