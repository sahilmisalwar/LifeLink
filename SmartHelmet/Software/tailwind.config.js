// SmartHelmet/Software/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080c14',
        surface: '#0d1117',
        'surface-2': '#161b22',
        border: '#21262d',
        'accent-cyan': '#5b8fb9',
        'accent-orange': '#f97316',
        warning: '#f59e0b',
        emergency: '#ef4444',
        safe: '#10b981',
        'text-primary': '#e6edf3',
        'text-secondary': '#8b949e',
      },
      animation: {
        'pulse-emergency': 'pulse-emergency 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-emergency': {
          '0%, 100%': { 'background-opacity': '0.05', opacity: '0.05' },
          '50%': { 'background-opacity': '0.15', opacity: '0.15' },
        },
      },
    },
  },
  plugins: [],
};
