import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Acción primaria: usar solo para CTAs y estados activos, para que resalte por contraste de uso.
        brand: {
          DEFAULT: '#FF5722',
          hover: '#E64A19',
          soft: '#FFE4DA',
        },
        // Texto base y pantallas de trabajo (modo oscuro de conteo). Jerarquía tipográfica vía opacidad: ink, ink/60, ink/40.
        ink: '#303841',
        // Fondo base claro + tarjetas elevadas, y variante oscura para la pantalla de conteo.
        surface: {
          DEFAULT: '#F5F5F5',
          card: '#FFFFFF',
          border: '#E4E4E4',
          dark: '#303841',
          darkCard: '#3B434E',
          darkBorder: '#4B5560',
        },
        // Acento secundario: enlaces, badges, datos informativos (no compite con el naranja de marca).
        accent: {
          DEFAULT: '#76ABAE',
          soft: '#E7F1F1',
          hover: '#5D9295',
        },
      },
    },
  },
  plugins: [],
};
export default config;
