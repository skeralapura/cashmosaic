/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Slate-based dark palette
        surface: {
          DEFAULT: '#0F172A', // slate-900 — page background
          card: '#1E293B',    // slate-800 — card backgrounds
          elevated: '#293548', // slightly lighter card
          border: '#334155',  // slate-700 — borders
        },
        accent: {
          DEFAULT: '#6366F1', // indigo-500
          hover: '#818CF8',   // indigo-400
          muted: '#312E81',   // indigo-900 — for badges
        },
        income: {
          DEFAULT: '#22C55E', // green-500
          muted: '#14532D',   // green-900
        },
        expense: {
          DEFAULT: '#EF4444', // red-500
          muted: '#7F1D1D',   // red-900
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
