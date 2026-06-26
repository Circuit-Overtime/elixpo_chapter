'use client';

import Link from 'next/link';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* -----------------------------------------------------------------------------
 * Staggered pixel-field physics engine (vanilla canvas — no deps).
 * Faint white motes with purple accents rippling outward from centre, faded
 * into the page background by a vignette. Ported from the payouts PixelHero.
 * -------------------------------------------------------------------------- */

type Pixel = {
  x: number;
  y: number;
  color: string;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInt: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  speed: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;
  draw: () => void;
  appear: () => void;
};

function createPixel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  color: string,
  baseSpeed: number,
  delay: number,
): Pixel {
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const p: Pixel = {
    x,
    y,
    color,
    size: 0,
    sizeStep: rand(0.12, 0.28),
    minSize: 0.5,
    maxSizeInt: 2,
    maxSize: rand(0.5, 2),
    delay,
    counter: 0,
    counterStep: rand(1.8, 3.2) + (canvas.width + canvas.height) * 0.008,
    speed: rand(0.08, 0.4) * baseSpeed,
    isIdle: false,
    isReverse: false,
    isShimmer: false,
    draw() {
      const offset = p.maxSizeInt * 0.5 - p.size * 0.5;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x + offset, p.y + offset, p.size, p.size);
    },
    appear() {
      p.isIdle = false;
      if (p.counter <= p.delay) {
        p.counter += p.counterStep;
        return;
      }
      if (p.size >= p.maxSize) p.isShimmer = true;
      if (p.isShimmer) {
        if (p.size >= p.maxSize) p.isReverse = true;
        else if (p.size <= p.minSize) p.isReverse = false;
        p.size += p.isReverse ? -p.speed : p.speed;
      } else {
        p.size += p.sizeStep;
      }
      p.draw();
    },
  };
  return p;
}

function PixelCanvas({ colors, gap = 6 }: { colors: string[]; gap?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);
  const reducedRef = useRef(false);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || colors.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = wrap.getBoundingClientRect();
    const w = Math.floor(width);
    const h = Math.floor(height);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const speed = reducedRef.current ? 0 : 30 * 0.001;
    const pixels: Pixel[] = [];
    for (let x = 0; x < w; x += gap) {
      for (let y = 0; y < h; y += gap) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const dx = x - w / 2;
        const dy = y - h / 2;
        const delay = reducedRef.current
          ? 0
          : Math.sqrt(dx * dx + dy * dy) * 0.65;
        pixels.push(createPixel(ctx, canvas, x, y, color, speed, delay));
      }
    }
    pixelsRef.current = pixels;
  }, [colors, gap]);

  const animate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const frameInterval = 1000 / 60;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      const elapsed = now - lastRef.current;
      if (elapsed < frameInterval) return;
      lastRef.current = now - (elapsed % frameInterval);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const pixel of pixelsRef.current) pixel.appear();
      if (pixelsRef.current.every((p) => p.isIdle))
        cancelAnimationFrame(rafRef.current);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    init();
    const ro = new ResizeObserver(() => init());
    if (wrapRef.current) ro.observe(wrapRef.current);
    animate();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [init, animate]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Hero
 * -------------------------------------------------------------------------- */

const PIXELS = [
  'rgba(245,245,244,0.16)',
  'rgba(245,245,244,0.16)',
  'rgba(245,245,244,0.10)',
  '#9b7bf7',
  '#7c5cff',
];

const ArrowRight = (): ReactNode => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PixelHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative w-full flex flex-col justify-center items-center overflow-hidden isolate text-center px-4 pt-8 pb-20"
      style={{ minHeight: 'calc(100dvh - 68px)' }}
    >
      <style>{`
        @keyframes url-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* pixel field + vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <PixelCanvas colors={PIXELS} gap={7} />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, transparent 0%, rgba(11,13,18,0.5) 62%, #0b0d12 100%)',
          }}
        />
        {/* soft purple glow behind the headline */}
        <div
          className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '60vmax',
            height: '40vmax',
            background:
              'radial-gradient(circle, rgba(155,123,247,0.16) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* eyebrow */}
      <div
        className="relative z-[1] mb-6"
        style={{
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'url-rise 0.7s ease both' : undefined,
        }}
      >
        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold backdrop-blur-md"
          style={{
            color: '#b69aff',
            background: 'rgba(155,123,247,0.1)',
            border: '1px solid rgba(155,123,247,0.25)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#9b7bf7' }}
          />
          Built on Cloudflare&rsquo;s edge
        </span>
      </div>

      {/* headline — serif italic + sans extrabold gradient */}
      <h1
        className="relative z-[1] m-0 flex flex-wrap justify-center tracking-[-0.03em]"
        style={{
          lineHeight: 1.0,
          gap: '0 0.4em',
          fontSize: 'clamp(2.8rem, 8vw, 6rem)',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'url-rise 0.8s ease 0.05s both' : undefined,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'rgba(245,245,244,0.92)',
            textShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          Short links,
        </span>
        <span
          style={{
            fontWeight: 800,
            background:
              'linear-gradient(135deg, #f5f5f4 0%, #9b7bf7 42%, #5fb6ff 78%, #86efac 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          edge speed.
        </span>
      </h1>

      {/* subhead */}
      <p
        className="relative z-[1] mx-auto mt-7"
        style={{
          maxWidth: 600,
          fontSize: 'clamp(1rem, 2.4vw, 1.16rem)',
          lineHeight: 1.7,
          color: 'rgba(245,245,244,0.72)',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'url-rise 0.8s ease 0.15s both' : undefined,
        }}
      >
        A developer-first URL shortener that resolves on Cloudflare&rsquo;s edge.
        Instant redirects, click analytics, custom slugs, and a REST API — for
        any app you ship.
      </p>

      {/* CTAs — Tahoe glass buttons */}
      <div
        className="relative z-[1] flex flex-wrap justify-center gap-3 mt-9"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          transitionDelay: '0.35s',
        }}
      >
        <Link
          href="/api/auth/login"
          className="inline-flex items-center gap-2 h-[50px] px-[30px] rounded-[14px] text-[0.95rem] font-bold text-white no-underline"
          style={{
            background: 'linear-gradient(180deg, #a98cff 0%, #7c5cff 100%)',
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2), 0 14px 30px rgba(124,92,255,0.35)',
          }}
        >
          Start free
          <ArrowRight />
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 h-[50px] px-7 rounded-[14px] text-[0.95rem] font-bold text-[#f5f5f4] no-underline backdrop-blur-md"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
          }}
        >
          Read the docs
        </Link>
      </div>
    </section>
  );
}
