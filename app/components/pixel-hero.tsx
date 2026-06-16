"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

/* -----------------------------------------------------------------------------
 * Staggered pixel-field physics engine (vanilla canvas — no deps).
 * Adapted to the Elixpo palette: mostly faint white motes with purple accents
 * rippling outward from centre, faded into the page background by a vignette.
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
        const ctx = canvas.getContext("2d");
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
                const delay = reducedRef.current ? 0 : Math.sqrt(dx * dx + dy * dy) * 0.65;
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
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const pixel of pixelsRef.current) pixel.appear();
            if (pixelsRef.current.every((p) => p.isIdle)) cancelAnimationFrame(rafRef.current);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>
    );
}

/* -----------------------------------------------------------------------------
 * Hero
 * -------------------------------------------------------------------------- */

const PIXELS = [
    "rgba(245,245,244,0.16)",
    "rgba(245,245,244,0.16)",
    "rgba(245,245,244,0.10)",
    "#9b7bf7",
    "#7c5cff",
];

type Service = { name: string; color: string; svg?: ReactNode; letter?: string };

const SERVICES: Service[] = [
    {
        name: "Cloudflare",
        color: "#f6821f",
        svg: (
            <path
                d="M6.5 18a4 4 0 0 1-.4-7.98A5.2 5.2 0 0 1 16.4 9.4 4 4 0 0 1 16 18H6.5z"
                fill="#f6821f"
            />
        ),
    },
    { name: "Next.js", color: "#ffffff", letter: "N" },
    {
        name: "Razorpay",
        color: "#3395ff",
        svg: <path d="M14.5 3 8 14h3l-2 7 8-12h-3.2l2.1-6z" fill="#3395ff" />,
    },
    {
        name: "React",
        color: "#61dafb",
        svg: (
            <g stroke="#61dafb" fill="none" strokeWidth="1">
                <ellipse cx="12" cy="12" rx="10" ry="4" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
                <circle cx="12" cy="12" r="1.7" fill="#61dafb" stroke="none" />
            </g>
        ),
    },
    { name: "TypeScript", color: "#3178c6", letter: "TS" },
    { name: "Elixpo Accounts", color: "#9b7bf7", letter: "E" },
];

function ServiceIcon({ s }: { s: Service }) {
    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
            <span
                style={{
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: `${s.color}1f`,
                    border: `1px solid ${s.color}55`,
                    color: s.color,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-geist-mono), monospace",
                }}
            >
                {s.svg ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        {s.svg}
                    </svg>
                ) : (
                    s.letter
                )}
            </span>
            <span
                style={{
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: "rgba(245,245,244,0.6)",
                }}
            >
                {s.name}
            </span>
        </div>
    );
}

const ArrowRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            style={{
                position: "relative",
                width: "100%",
                minHeight: "calc(100dvh - 68px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                isolation: "isolate",
                padding: "2rem 1rem 5.5rem",
                textAlign: "center",
            }}
        >
            <style>{`
                @keyframes pay-marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
                .pay-marquee { animation: pay-marquee 26s linear infinite; }
                @keyframes pay-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* pixel field + vignette */}
            <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                <PixelCanvas colors={PIXELS} gap={7} />
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(circle at 50% 42%, transparent 0%, rgba(11,13,18,0.5) 62%, #0b0d12 100%)",
                    }}
                />
                {/* soft purple glow behind the headline */}
                <div
                    style={{
                        position: "absolute",
                        top: "30%",
                        left: "50%",
                        width: "60vmax",
                        height: "40vmax",
                        transform: "translate(-50%, -50%)",
                        background: "radial-gradient(circle, rgba(155,123,247,0.16) 0%, transparent 60%)",
                        filter: "blur(40px)",
                    }}
                />
            </div>

            {/* eyebrow */}
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    opacity: mounted ? 1 : 0,
                    animation: mounted ? "pay-rise 0.7s ease both" : undefined,
                    marginBottom: "1.4rem",
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        padding: "6px 14px",
                        borderRadius: 999,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#b69aff",
                        background: "rgba(155,123,247,0.1)",
                        border: "1px solid rgba(155,123,247,0.25)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    Payments-as-a-Service · Cloudflare edge
                </span>
            </div>

            {/* headline — serif italic + sans extrabold gradient */}
            <h1
                style={{
                    position: "relative",
                    zIndex: 1,
                    margin: 0,
                    lineHeight: 1.0,
                    letterSpacing: "-0.03em",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "0 0.4em",
                    fontSize: "clamp(2.8rem, 8vw, 6rem)",
                    opacity: mounted ? 1 : 0,
                    animation: mounted ? "pay-rise 0.8s ease 0.05s both" : undefined,
                }}
            >
                <span
                    style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontStyle: "italic",
                        fontWeight: 500,
                        color: "rgba(245,245,244,0.92)",
                        textShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                >
                    Payments
                </span>
                <span
                    style={{
                        fontWeight: 800,
                        background:
                            "linear-gradient(135deg, #f5f5f4 0%, #9b7bf7 38%, #86efac 68%, #fbbf24 100%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    infrastructure.
                </span>
            </h1>

            {/* subhead */}
            <p
                style={{
                    position: "relative",
                    zIndex: 1,
                    maxWidth: 620,
                    margin: "1.6rem auto 0",
                    fontSize: "clamp(1rem, 2.5vw, 1.18rem)",
                    lineHeight: 1.7,
                    color: "rgba(245,245,244,0.72)",
                    opacity: mounted ? 1 : 0,
                    animation: mounted ? "pay-rise 0.8s ease 0.15s both" : undefined,
                }}
            >
                The complete money stack for modern software — accept payments,
                run subscriptions, grant entitlements, and settle payouts through
                one API and a unified ledger. Powering billing across the Elixpo
                suite, and open to every business building on it.
            </p>

            {/* CTAs — Tahoe glass buttons */}
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    gap: 12,
                    marginTop: "2.2rem",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(24px)",
                    transition: "opacity 0.8s ease, transform 0.8s ease",
                    transitionDelay: "0.35s",
                }}
            >
                <Link
                    href="/login"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        height: 50,
                        padding: "0 30px",
                        borderRadius: 14,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#fff",
                        textDecoration: "none",
                        background: "linear-gradient(180deg, #a98cff 0%, #7c5cff 100%)",
                        boxShadow:
                            "inset 0 1px 1px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2), 0 14px 30px rgba(124,92,255,0.35)",
                    }}
                >
                    Start building
                    <ArrowRight />
                </Link>
                <Link
                    href="/docs"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        height: 50,
                        padding: "0 28px",
                        borderRadius: 14,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#f5f5f4",
                        textDecoration: "none",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)",
                    }}
                >
                    Read the docs
                </Link>
            </div>

            {/* powered-by marquee */}
            <div
                style={{
                    position: "absolute",
                    bottom: "2rem",
                    left: 0,
                    right: 0,
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    opacity: mounted ? 1 : 0,
                    transition: "opacity 1s ease",
                    transitionDelay: "0.55s",
                }}
            >
                <span
                    style={{
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "rgba(245,245,244,0.4)",
                        fontWeight: 600,
                    }}
                >
                    Built on the edge stack
                </span>
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: 760,
                        overflow: "hidden",
                        WebkitMaskImage:
                            "linear-gradient(to right, transparent, white 15%, white 85%, transparent)",
                        maskImage:
                            "linear-gradient(to right, transparent, white 15%, white 85%, transparent)",
                    }}
                >
                    <div className="pay-marquee" style={{ display: "flex", width: "max-content", gap: 44, padding: "4px 0" }}>
                        {[0, 1].map((dup) => (
                            <div key={dup} style={{ display: "flex", gap: 44, alignItems: "center" }} aria-hidden={dup === 1}>
                                {SERVICES.map((s) => (
                                    <ServiceIcon key={`${dup}-${s.name}`} s={s} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
