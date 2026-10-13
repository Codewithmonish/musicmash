/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5CF6', // Futuristic Electric Purple
          light: '#A78BFA',
          dark: '#6D28D9',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#EC4899', // Magenta / Electric Pink
          light: '#F472B6',
          dark: '#BE185D',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#06B6D4', // Vibrant Cyber Cyan
          light: '#22D3EE',
          dark: '#0891B2',
          foreground: '#07070D',
        },
        background: '#06060A',
        foreground: '#F8FAFC',
        surface: {
          DEFAULT: '#0F101A',
          border: '#1E2035',
          hover: '#17192A',
        },
        card: {
          DEFAULT: 'rgba(15, 16, 26, 0.75)',
          foreground: '#F8FAFC',
          border: 'rgba(139, 92, 246, 0.15)',
        },
        popover: {
          DEFAULT: '#0F101A',
          foreground: '#F8FAFC',
        },
        text: '#F8FAFC',
        muted: {
          DEFAULT: '#94A3B8',
          foreground: '#64748B',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: 'rgba(255, 255, 255, 0.08)',
        input: 'rgba(255, 255, 255, 0.05)',
        ring: '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'neon-purple-glow': 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(6, 6, 10, 0) 70%)',
        'neon-cyan-glow': 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(6, 6, 10, 0) 70%)',
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
        'glow-magenta': '0 0 25px -5px rgba(236, 72, 153, 0.4)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'equalizer': 'equalizer 1.2s ease-in-out infinite alternate',
        'wave': 'wave 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.7), 0 0 50px rgba(6, 182, 212, 0.4)' },
        },
        equalizer: {
          '0%': { height: '15%' },
          '100%': { height: '100%' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        xl: '20px',
      },
    },
  },
  plugins: [],
}
