/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tally Prime Official Palette
        tally: {
          dark: '#00253d',        // Title bar & bottom bar
          navy: '#003859',        // Action ribbon & header buttons
          teal: '#004b6e',        // Gateway header, voucher title bar
          'teal-dark': '#00344d', // Header accents
          'teal-light': '#00628f',
          canvas: '#dbe7ee',      // The iconic Tally pale blue-grey canvas
          panel: '#ffffff',       // Content & form panels
          'panel-alt': '#f2f7fa',  // Alternating row background
          border: '#8caebd',      // 1px crisp borders
          'border-dark': '#557e96',
          yellow: '#fed843',      // The legendary Tally yellow selection cursor
          'yellow-hover': '#f5cb28',
          hotkey: '#a61a1a',      // Hotkey underline / red accelerator
          'btn-bar': '#c2d7e4',   // Right-side function button bar
          btn: '#edf4f8',         // Function button background
          'btn-border': '#7ea1b5',// Function button border
          text: '#0d222f',        // Primary text
          'text-muted': '#4a6777',// Secondary label text
        },
        // Clean enterprise color palette mapping
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#004b6e',
          800: '#003859',
          900: '#00253d',
          950: '#001624',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fed843', // Tally yellow
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
      },
    },
  },
  plugins: [],
};
