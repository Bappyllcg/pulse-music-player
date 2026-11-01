/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        eq: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        marquee: 'marquee var(--marquee-duration, 12s) linear infinite',
        eq: 'eq 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

