/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4f9',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#80a3c9',
          400: '#4d7db0',
          500: '#2a5f96',
          600: '#1e4a7a',
          700: '#163a61',
          800: '#0f2a48',
          900: '#081a2e',
        },
        gold: {
          400: '#f0c040',
          500: '#d4a820',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
