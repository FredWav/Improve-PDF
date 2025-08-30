/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif','system-ui','Segoe UI','Roboto','Inter',
          'Helvetica Neue','Arial','Noto Sans','Apple Color Emoji',
          'Segoe UI Emoji','Segoe UI Symbol'
        ],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
}
