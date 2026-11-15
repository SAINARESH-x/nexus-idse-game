import type { Config } from 'tailwindcss'

// Tailwind theme: NEXUS colour tokens, display/mono/body fonts, and glow shadows.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#05070D',
        panel: '#0B1020',
        panel2: '#111830',
        border: '#1E2A4A',
        text: '#E6ECFF',
        muted: '#8A97B8',
        cyan: '#00E5FF',
        magenta: '#FF2BD6',
        amber: '#FFB020',
        green: '#3DFF9A',
        red: '#FF4D6D',
        violet: '#9B7BFF',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Inter Variable', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(0, 229, 255, 0.35)',
        'glow-cyan-sm': '0 0 10px rgba(0, 229, 255, 0.25)',
        'glow-magenta': '0 0 24px rgba(255, 43, 214, 0.3)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'glitch-shift': {
          '0%, 92%, 100%': { transform: 'translate(0, 0)', opacity: '1' },
          '93%': { transform: 'translate(-1px, 1px)', opacity: '0.9' },
          '95%': { transform: 'translate(2px, -1px)', opacity: '0.85' },
          '97%': { transform: 'translate(-1px, -1px)', opacity: '1' },
        },
        'scan-line': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'glitch-shift': 'glitch-shift 6s steps(1) infinite',
        'scan-line': 'scan-line 12s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
