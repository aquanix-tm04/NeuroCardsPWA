/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef1',
          200: '#d8d8df',
          300: '#b6b6c2',
          400: '#8e8e9e',
          500: '#6f6f82',
          600: '#57576a',
          700: '#414152',
          800: '#2c2c3a',
          900: '#1b1b26',
          950: '#0f0f17',
        },
        brand: {
          50: '#eefcf5',
          100: '#d5f7e6',
          200: '#aeeed0',
          300: '#79e0b4',
          400: '#3ecb93',
          500: '#16b27a',
          600: '#0b8f62',
          700: '#0a7250',
          800: '#0b5a41',
          900: '#0a4a37',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(0,0,0,0.08), 0 4px 20px -4px rgba(0,0,0,0.06)',
        'card-dark': '0 2px 8px -2px rgba(0,0,0,0.3), 0 4px 20px -4px rgba(0,0,0,0.25)',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
