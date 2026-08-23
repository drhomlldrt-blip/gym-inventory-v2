import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF5722',
          accent: '#FF5722',
        },
        surface: {
          DEFAULT: '#303841',
          card: '#3D4750',
          cardHeader: '#262D34',
          border: '#4B555F',
        },
        muted: '#76ABAE',
        paper: '#F5F5F5',
      },
    },
  },
  plugins: [],
};
export default config;
