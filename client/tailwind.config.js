/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f9f2',
          100: '#dcf2e1',
          200: '#bbe4c6',
          300: '#8ecfa1',
          400: '#58b276',
          500: '#339555',
          600: '#237843',
          700: '#1c5f37',
          800: '#184c2e',
          900: '#143f27',
          950: '#082315',
        },
        ember: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f2791b',
          600: '#e05f0c',
          700: '#b9460c',
          800: '#93380f',
          900: '#772f10',
        },
        cream: '#FAF6EC',
        sand: '#F1E9D6',
        bark: '#5A3A22',
        ink: '#161B15',
      },
      fontFamily: {
        display: ['"Outfit Variable"', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 40px -18px rgba(20, 63, 39, 0.35)',
        lift: '0 24px 60px -24px rgba(20, 63, 39, 0.45)',
        ember: '0 16px 40px -16px rgba(242, 121, 27, 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      opacity: {
        4: '0.04',
        6: '0.06',
        8: '0.08',
        12: '0.12',
      },
      backgroundImage: {
        'grain': "radial-gradient(circle at 1px 1px, rgba(22,27,21,0.06) 1px, transparent 0)",
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        emberRise: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.9' },
          '100%': { transform: 'translateY(-120px) scale(0.4)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        emberRise: 'emberRise 3.2s ease-in infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        marquee: 'marquee 36s linear infinite',
      },
    },
  },
  plugins: [],
};
