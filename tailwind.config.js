/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1F4F3',
        surface: '#FFFFFF',
        line: '#D9E1DF',
        ink: { DEFAULT: '#16323B', soft: '#4C666F', faint: '#88A0A7' },
        brand: { DEFAULT: '#1C4A57', dark: '#123742', light: '#2F6B7A' },
        highlight: { DEFAULT: '#FFCF5C', dark: '#F2BE3C', soft: '#FFE9A8' },
        skill: {
          listening: '#2E7DB2',
          speaking: '#E06A55',
          writing: '#7B5EA7',
          reading: '#5C8A73',
        },
        success: '#3F7D5A',
        danger: '#C34B36',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,50,59,0.05), 0 10px 30px -18px rgba(22,50,59,0.25)',
        lift: '0 2px 6px rgba(22,50,59,0.06), 0 18px 40px -20px rgba(22,50,59,0.35)',
      },
      maxWidth: { prose: '68ch' },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'loop-pulse': {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '.55' },
        },
      },
      animation: {
        'rise-in': 'rise-in .6s cubic-bezier(.2,.7,.2,1) both',
        'loop-pulse': 'loop-pulse 1.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
