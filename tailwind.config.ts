import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette shared with the public Bin Suleman website.
        navy: {
          DEFAULT: '#0b1329',
          800: '#131d3d',
          700: '#1c274a',
          600: '#26325a',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#fed65b',
          dark: '#a8871f',
        },
      },
      fontFamily: {
        sans: [
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [forms],
};

export default config;
