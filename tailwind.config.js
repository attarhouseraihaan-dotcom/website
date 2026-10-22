/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0b',
        gold: '#c8a45d',
        'gold-light': '#e5cc91',
        ivory: '#f8f4eb',
      },
    },
  },
  plugins: [],
}
