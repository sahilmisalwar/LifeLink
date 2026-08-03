// SmartHelmet/Software/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080c14',
        surface: '#0f1724',
        'surface-2': '#1a2540',
        border: '#1e2d4a',
        'accent-cyan': '#00d4ff',
        'accent-orange': '#f97316',
        warning: '#f59e0b',
        emergency: '#ef4444',
        safe: '#10b981',
        'text-primary': '#f0f4ff',
        'text-secondary': '#64748b',
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
