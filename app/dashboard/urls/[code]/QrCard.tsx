'use client';

import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';

interface Props {
  shortUrl: string;
  /** True if user has Pro+ — gates the "Custom QR" CTA */
  canCustomize?: boolean;
}

const QR_SIZE = 320; // canvas px — high enough for a sharp 1024px PNG download
const LOGO_RATIO = 0.22; // logo covers ~22% of QR width (well within error-correction H budget)
const ACCENT = '#9b7bf7';

/**
 * Per-URL QR card.
 *
 * Free tier: standard purple-on-white QR with the ElixpoURL logo in the
 * center (covered by the QR's H-level error correction so the code still
 * scans). Download as PNG.
 *
 * Custom branding (color, frame, logo swap) is the paid feature — shown
 * as "Coming soon" until the Pro tier ships.
 */
export default function QrCard({ shortUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const render = async () => {
      try {
        // H-level error correction = up to 30% damage tolerance. That's
        // what lets us safely overlay a center logo without breaking
        // scan reliability.
        await QRCode.toCanvas(canvas, shortUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: QR_SIZE,
          color: {
            dark: '#0b0d12', // QR modules — dark on white prints best
            light: '#ffffff',
          },
        });

        // Overlay the ElixpoURL logo in the center
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/base_logo.png';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('logo load failed'));
        });

        if (cancelled) return;

        const logoSize = Math.floor(QR_SIZE * LOGO_RATIO);
        const x = (QR_SIZE - logoSize) / 2;
        const y = (QR_SIZE - logoSize) / 2;

        // Knock out the QR modules behind the logo with a white square +
        // a thin purple border so the logo stays legible. The H-level
        // ECC absorbs the missing data.
        const pad = 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 3;
        ctx.strokeRect(
          x - pad + 1.5,
          y - pad + 1.5,
          logoSize + pad * 2 - 3,
          logoSize + pad * 2 - 3,
        );

        // Draw logo with rounded clip
        ctx.save();
        const r = logoSize * 0.18;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + logoSize, y, x + logoSize, y + r, r);
        ctx.arcTo(x + logoSize, y + logoSize, x + logoSize - r, y + logoSize, r);
        ctx.arcTo(x, y + logoSize, x, y + logoSize - r, r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, logoSize, logoSize);
        ctx.restore();

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'QR render failed');
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [shortUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    // Pull a "slug" out of the URL for the filename
    const slug = shortUrl.split('/').filter(Boolean).pop() || 'qr';
    link.download = `elixpourl-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/45">
          QR code
        </div>
        <span
          className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(155,123,247,0.12)',
            color: '#c8b6ff',
            border: '1px solid rgba(155,123,247,0.3)',
          }}
        >
          Free
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* QR canvas */}
        <div
          className="rounded-xl overflow-hidden p-3"
          style={{
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={QR_SIZE}
            height={QR_SIZE}
            className="block"
            style={{ width: 220, height: 220 }}
            aria-label={`QR code for ${shortUrl}`}
          />
        </div>

        {error && (
          <div
            className="text-xs text-center px-3 py-2 rounded-lg w-full"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!ready}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background:
                'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
              boxShadow: '0 4px 14px rgba(155,123,247,0.35)',
              opacity: ready ? 1 : 0.6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </button>

          {/* Custom QR — paid teaser */}
          <button
            type="button"
            disabled
            title="Custom colors, frames, and logos arrive with Pro"
            className="inline-flex items-center justify-between gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <line x1="2" y1="2" x2="7.586" y2="7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
              Custom QR
            </span>
            <span
              className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Soon · Pro
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
