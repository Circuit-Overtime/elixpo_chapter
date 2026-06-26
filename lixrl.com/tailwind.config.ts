import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0b0d12',
          card: 'rgba(20, 22, 30, 0.8)',
          glass: 'rgba(255,255,255,0.05)',
          'glass-hover': 'rgba(255,255,255,0.08)',
          overlay: 'rgba(11, 13, 18, 0.95)',
        },

        // Single accent palette — purple, matches the rest of the Elixpo
        // ecosystem (accounts.elixpo, elixpo.com).
        accent: {
          main: '#9b7bf7',
          deep: '#7c5cff',
          light: '#b094ff',
          dim: 'rgba(155, 123, 247, 0.15)',
          border: 'rgba(155, 123, 247, 0.3)',
          glow: 'rgba(155, 123, 247, 0.45)',
        },

        text: {
          primary: '#f5f5f4',
          secondary: 'rgba(245, 245, 244, 0.8)',
          muted: 'rgba(245, 245, 244, 0.7)',
          subtle: 'rgba(255, 255, 255, 0.5)',
          disabled: 'rgba(255, 255, 255, 0.4)',
        },
        border: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          strong: 'rgba(255, 255, 255, 0.2)',
          hover: 'rgba(155, 123, 247, 0.45)',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card-hover': '0 20px 40px -10px rgba(0,0,0,0.4)',
        'glow-accent': '0 0 20px rgba(155, 123, 247, 0.45)',
        button: '0 8px 24px rgba(155, 123, 247, 0.35)',
      },
      backgroundImage: {
        'gradient-card':
          'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-accent':
          'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
        'gradient-accent-hover':
          'linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
