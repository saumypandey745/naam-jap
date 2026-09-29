/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary dark spiritual palette
        bg: {
          base: '#0D0A1A',
          surface: '#1A1530',
          elevated: '#231E3D',
          card: '#2A2448',
        },
        // Saffron / gold accent
        gold: {
          50: '#FFF9EC',
          100: '#FFF0C7',
          200: '#FFDF89',
          300: '#FFC94A',
          400: '#FFB520',
          500: '#E8A94A',
          600: '#C9842A',
          700: '#A3640F',
          800: '#864E0E',
          900: '#724112',
        },
        // Text
        text: {
          primary: '#F5F0E8',
          secondary: '#C5BAA8',
          muted: '#8B7E6E',
          disabled: '#5A5046',
        },
        // Status
        success: '#4CAF8A',
        error: '#E05C5C',
        warning: '#E8963A',
        info: '#6B9FD4',
        // Light mode overrides
        light: {
          bg: '#FDF8F0',
          surface: '#FFF5E6',
          elevated: '#FFEFD5',
          card: '#FFE8C0',
          text: {
            primary: '#1A1530',
            secondary: '#4A3F2F',
            muted: '#7A6A5A',
          },
        },
      },
      fontFamily: {
        devanagari: ['"Noto Serif Devanagari"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'counter-xl': ['5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'counter-lg': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'mantra-xl': ['2.5rem', { lineHeight: '1.2' }],
        'mantra-lg': ['2rem', { lineHeight: '1.2' }],
        'mantra-md': ['1.5rem', { lineHeight: '1.3' }],
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'count-pop': 'count-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'mala-fill': 'mala-fill 0.5s ease-out',
        'jap-detect': 'jap-detect 0.6s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(201, 132, 42, 0.2)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(201, 132, 42, 0.5), 0 0 80px rgba(201, 132, 42, 0.15)',
          },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'count-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        'mala-fill': {
          from: { strokeDashoffset: '100' },
          to: { strokeDashoffset: '0' },
        },
        'jap-detect': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.95)' },
          '60%': { opacity: '1', transform: 'translateY(-4px) scale(1.02)' },
          '100%': { opacity: '0', transform: 'translateY(-16px) scale(1)' },
        },
      },
      boxShadow: {
        'glow-gold': '0 0 30px rgba(201, 132, 42, 0.35)',
        'glow-gold-lg': '0 0 60px rgba(201, 132, 42, 0.4)',
        'glow-success': '0 0 20px rgba(76, 175, 138, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backgroundImage: {
        'gradient-spiritual':
          'radial-gradient(ellipse at top, #231E3D 0%, #0D0A1A 70%)',
        'gradient-gold':
          'linear-gradient(135deg, #C9842A 0%, #E8A94A 100%)',
        'gradient-gold-soft':
          'linear-gradient(135deg, rgba(201,132,42,0.15) 0%, rgba(232,169,74,0.05) 100%)',
        'gradient-surface':
          'linear-gradient(180deg, #1A1530 0%, #150F2A 100%)',
      },
    },
  },
  plugins: [],
};
