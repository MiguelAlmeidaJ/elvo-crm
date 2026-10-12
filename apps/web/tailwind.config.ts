import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { midnight: '#0B1324', mint: '#6DE4BF' } } },
  plugins: [],
} satisfies Config;
