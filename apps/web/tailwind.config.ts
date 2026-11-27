import type { Config } from 'tailwindcss';

/**
 * Tailwind mirrors the CSS custom properties in src/styles/tokens.css.
 * Every value is a var() reference so theme intensity / low-power mode can
 * retune the product at runtime without a rebuild.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          black: 'var(--void-black)',
          abyss: 'var(--abyss)',
          obsidian: 'var(--obsidian)',
          basalt: 'var(--basalt)',
          slag: 'var(--slag)',
        },
        titan: {
          purple: {
            900: 'var(--titan-purple-900)',
            700: 'var(--titan-purple-700)',
            500: 'var(--titan-purple-500)',
            300: 'var(--titan-purple-300)',
          },
          gold: {
            700: 'var(--titan-gold-700)',
            500: 'var(--titan-gold-500)',
            300: 'var(--titan-gold-300)',
          },
        },
        ember: 'var(--ember)',
        ash: 'var(--ash)',
        bone: {
          DEFAULT: 'var(--bone)',
          dim: 'var(--bone-dim)',
        },
        gem: {
          violet: 'var(--gem-violet)',
          azure: 'var(--gem-azure)',
          emerald: 'var(--gem-emerald)',
          amber: 'var(--gem-amber)',
          crimson: 'var(--gem-crimson)',
          cyan: 'var(--gem-cyan)',
          gold: 'var(--titan-gold-500)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        ui: ['var(--font-ui)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: '1.35' }],
        sm: ['var(--text-sm)', { lineHeight: '1.45' }],
        base: ['var(--text-base)', { lineHeight: '1.55' }],
        lg: ['var(--text-lg)', { lineHeight: '1.4' }],
        xl: ['var(--text-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
        display: ['var(--text-display)', { lineHeight: '1.05' }],
      },
      boxShadow: {
        sink: 'var(--shadow-sink)',
        plate: 'var(--shadow-plate)',
        gem: 'var(--shadow-gem)',
        'glow-violet': 'var(--glow-violet)',
        'glow-gold': 'var(--glow-gold)',
        focus: 'var(--focus-ring)',
      },
      backgroundImage: {
        titan: 'var(--grad-titan)',
        gold: 'var(--grad-gold)',
        'gold-text': 'var(--grad-gold-text)',
        obsidian: 'var(--grad-obsidian)',
        ember: 'var(--grad-ember)',
      },
      transitionTimingFunction: {
        inertia: 'var(--ease-inertia)',
        collapse: 'var(--ease-collapse)',
        emphasis: 'var(--ease-emphasis)',
      },
      transitionDuration: {
        fast: '140ms',
        base: '260ms',
        slow: '520ms',
      },
      keyframes: {
        'gem-ignite': {
          '0%': { filter: 'brightness(1)', transform: 'scale(1)' },
          '35%': { filter: 'brightness(1.9)', transform: 'scale(1.06)' },
          '100%': { filter: 'brightness(1)', transform: 'scale(1)' },
        },
        'edge-ripple': {
          '0%': { opacity: '0', transform: 'scale(1)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'scale(1.02)' },
        },
        'ember-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.6)' },
          '35%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-10px) scale(1)' },
        },
        'aura-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-140%)' },
          '100%': { transform: 'translateX(140%)' },
        },
        'portal-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'dock-drift': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.6)' },
          '40%': { opacity: '0.9' },
          '100%': { opacity: '0', transform: 'translateY(-16px) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'gem-ignite': 'gem-ignite 520ms var(--ease-inertia)',
        'edge-ripple': 'edge-ripple 700ms var(--ease-inertia)',
        'ember-rise': 'ember-rise 1400ms var(--ease-collapse) infinite',
        'aura-pulse': 'aura-pulse 3.2s ease-in-out infinite',
        'portal-spin': 'portal-spin 40s linear infinite',
        'dock-drift': 'dock-drift 1600ms var(--ease-inertia) infinite',
        'fade-in': 'fade-in 260ms var(--ease-inertia)',
      },
      spacing: {
        1.5: '0.375rem',
      },
    },
  },
  plugins: [],
};

export default config;
