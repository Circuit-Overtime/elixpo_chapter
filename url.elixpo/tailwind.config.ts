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
          deep: '#0c0f0a',
          card: 'rgba(16, 24, 12, 0.8)',
          glass: 'rgba(255,255,255,0.05)',
          'glass-hover': 'rgba(255,255,255,0.08)',
          overlay: 'rgba(12, 15, 10, 0.95)',
        },
        lime: {
          main: '#a3e635',
          light: '#bef264',
          dim: 'rgba(163, 230, 53, 0.15)',
          border: 'rgba(163, 230, 53, 0.3)',
          glow: 'rgba(163, 230, 53, 0.6)',
        },
        sage: {
          main: '#86efac',
          dim: 'rgba(134, 239, 172, 0.15)',
          border: 'rgba(134, 239, 172, 0.3)',
        },
        honey: {
          main: '#fbbf24',
          dim: 'rgba(251, 191, 36, 0.15)',
          border: 'rgba(251, 191, 36, 0.3)',
        },
        lavender: {
          main: '#c4b5fd',
          dim: 'rgba(196, 181, 253, 0.15)',
          border: 'rgba(168, 85, 247, 0.3)',
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
          hover: 'rgba(255, 255, 255, 0.3)',
        },
      },
      fontFamily: {
        body: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Space Grotesk"', '"DM Sans"', 'sans-serif'],
        mono: ['monospace'],
      },
      boxShadow: {
        card: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card-hover': '0 20px 40px -10px rgba(0,0,0,0.4)',
        'glow-lime': '0 0 20px rgba(163, 230, 53, 0.6)',
        button: '0 8px 25px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        'gradient-page': 'linear-gradient(135deg, #0c0f0a 0%, #0f1410 50%, #0c0f0a 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-accent': 'linear-gradient(90deg, #a3e635, #86efac, #fbbf24)',
      },
    },
  },
  plugins: [],
};

export default config;
