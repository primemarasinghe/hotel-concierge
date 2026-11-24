/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#8B6914',
          dark:    '#6B4F0F',
          light:   '#F5EDD9',
          muted:   '#B8921C',
        },
        warm: {
          50:  '#FAF7F2',
          100: '#F3EBD8',
          200: '#E8DCC8',
          300: '#D6C4A8',
          700: '#6B5544',
          800: '#3D2B1A',
          900: '#2D1F0A',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
