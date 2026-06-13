'use client';

type Variant = 'default' | 'auth' | 'warm';

const PALETTES: Record<Variant, [string, string, string]> = {
  default: ['#9b7bf7', '#5fb6ff', '#7c5cff'],
  auth: ['#9b7bf7', '#ff7cc9', '#5fb6ff'],
  warm: ['#ff8a5b', '#ff5b9a', '#9b7bf7'],
};

interface Props {
  variant?: Variant;
}

export default function BackgroundAurora({ variant = 'default' }: Props) {
  const [a, b, c] = PALETTES[variant];

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0b0d12 0%, #11151c 50%, #0b0d12 100%)',
      }}
    >
      <div
        className="absolute rounded-full will-change-transform"
        style={{
          top: '-20vmax',
          left: '-15vmax',
          width: '55vmax',
          height: '55vmax',
          filter: 'blur(110px)',
          opacity: 0.32,
          background: `radial-gradient(circle, ${a} 0%, transparent 65%)`,
          animation: 'auroraDriftA 28s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full will-change-transform"
        style={{
          bottom: '-25vmax',
          right: '-20vmax',
          width: '55vmax',
          height: '55vmax',
          filter: 'blur(110px)',
          opacity: 0.32,
          background: `radial-gradient(circle, ${b} 0%, transparent 65%)`,
          animation: 'auroraDriftB 34s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full will-change-transform"
        style={{
          top: '40%',
          left: '55%',
          width: '40vmax',
          height: '40vmax',
          filter: 'blur(120px)',
          opacity: 0.18,
          background: `radial-gradient(circle, ${c} 0%, transparent 65%)`,
          animation: 'auroraDriftC 40s ease-in-out infinite',
        }}
      />
    </div>
  );
}
