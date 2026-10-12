import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      midnight: '#101B2B', mint: '#5DE0BE', cloud: '#F5F7FA',
      'brand-slate': '#64748B', success: '#16A085',
    },
    fontFamily: { sans: ['var(--font-inter)', 'Arial', 'sans-serif'], sora: ['var(--font-sora)', 'Arial', 'sans-serif'] },
  } },
  plugins: [],
} satisfies Config;
