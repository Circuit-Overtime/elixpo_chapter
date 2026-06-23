'use client';

import { useMemo, useRef, useState } from 'react';
import Modal from '@/app/components/Modal';
import {
  buildQrOptions,
  DEFAULT_PRESET_ID,
  getPreset,
} from '@/lib/qr/presets';
import QrStudio from './QrStudio';
import StyledQr, { type StyledQrHandle } from './StyledQr';

interface Props {
  shortUrl: string;
  /** Reserved for future tier gating of the studio. Unused for now. */
  canCustomize?: boolean;
}

const QR_DISPLAY = 220;
const QR_BACKBUFFER = 1024; // crisp downloads regardless of on-screen size

/**
 * Per-URL QR card. Renders a styled QR (qr-code-styling, client-side only —
 * the lib touches the DOM and can't run on the edge) and opens a studio for
 * picking a style from the catalog and adding a logo by public URL.
 */
export default function QrCard({ shortUrl }: Props) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [logoUrl, setLogoUrl] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<StyledQrHandle>(null);

  const slug = shortUrl.split('/').filter(Boolean).pop() || 'qr';
  const filename = `elixpourl-${slug}`;

  const options = useMemo(
    () => buildQrOptions(getPreset(presetId), { data: shortUrl, image: logoUrl, size: QR_BACKBUFFER }),
    [presetId, logoUrl, shortUrl],
  );

  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        width: '100%',
        maxWidth: '320px',
        boxSizing: 'border-box',
        marginInline: 'auto',
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
          Styled
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        <div
          className="rounded-xl flex items-center justify-center"
          style={{
            width: QR_DISPLAY + 16,
            height: QR_DISPLAY + 16,
            flexShrink: 0,
            padding: 8,
            boxSizing: 'border-box',
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(155,123,247,0.18)',
          }}
        >
          <StyledQr
            ref={qrRef}
            options={options}
            display={QR_DISPLAY}
            filename={filename}
            onError={setError}
          />
        </div>

        {error && (
          <div
            className="text-xs text-center px-3 py-2 rounded-lg w-full"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={() => qrRef.current?.download('png')}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer border-none"
            style={{
              background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)',
              boxShadow: '0 4px 14px rgba(155,123,247,0.35)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </button>

          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <line x1="2" y1="2" x2="7.586" y2="7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            Customize
          </button>
        </div>
      </div>

      <Modal
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        title="Customize QR code"
        description="Pick a style and add your logo by public URL."
        size="lg"
      >
        <QrStudio
          shortUrl={shortUrl}
          filename={filename}
          presetId={presetId}
          onPresetChange={setPresetId}
          logoUrl={logoUrl}
          onLogoChange={setLogoUrl}
        />
      </Modal>
    </div>
  );
}
