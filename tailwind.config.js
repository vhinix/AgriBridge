/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,jsx}",
    "./{context,hooks,lib,pages,services}/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D32',
        primaryDark: '#1B5E20',
        secondary: '#81C784',
        pale: '#DCEEDC',
        bg: '#F8FAF7',
        surface: '#FFFFFF',
        tint: '#F4F8F4',
        border: '#E2E7E2',
        text: '#1F2937',
        muted: '#4B5563',
        soft: '#6B7280',
        accent: '#F4B400',
        accentInk: '#8A6400',
        accentTint: '#FCEFCC',
        error: '#D32F2F',
      },
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,41,55,.04),0 8px 24px rgba(31,41,55,.05)',
        panel: '0 2px 4px rgba(31,41,55,.04),0 12px 32px rgba(31,41,55,.06)',
      },
      keyframes: {
        'agb-pop': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: { pop: 'agb-pop 240ms ease-out' },
    },
  },
  plugins: [],
};
