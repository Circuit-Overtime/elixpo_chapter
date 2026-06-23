'use client';

import { useMemo, useRef, useState } from 'react';
import {
  buildQrOptions,
  getPreset,
  QR_PRESETS,
} from '@/lib/qr/presets';
import StyledQr, { type StyledQrHandle } from './StyledQr';

interface Props {
  shortUrl: string;
  filename: string;
  presetId: string;
  onPresetChange: (id: string) => void;
  logoUrl: string;
  onLogoChange: (url: string) => void;
}

const ACCENT = '#9b7bf7';

export default function QrStudio({
  shortUrl,
  filename,
  presetId,
  onPresetChange,
  logoUrl,
  onLogoChange,
}: Props) {
  const [logoDraft, setLogoDraft] = useState(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<StyledQrHandle>(null);

  const preset = getPreset(presetId);
  const mainOptions = useMemo(
    () => buildQrOptions(preset, { data: shortUrl, image: logoUrl, size: 1024 }),
    [preset, shortUrl, logoUrl],
  );

  const applyLogo = () => {
    const v = logoDraft.trim();
    if (v && !/^https?:\/\/.+/i.test(v)) {
      setError('Logo must be a public http(s) URL to a .png image.');
      return;
    }
    setError(null);
    onLogoChange(v);
  };

  const download = async (ext: 'png' | 'svg') => {
    setError(null);
    await qrRef.current?.download(ext);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Preview + downloads */}
      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div
          className="rounded-xl shrink-0 flex items-center justify-center"
          style={{
            width: 236,
            height: 236,
            padding: 8,
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(155,123,247,0.18)',
          }}
        >
          <StyledQr ref={qrRef} options={mainOptions} display={220} filename={filename} onError={setError} />
        </div>

        <div className="flex-1 w-full flex flex-col gap-3">
          {/* Logo URL */}
          <div>
            <label className="text-[0.7rem] uppercase tracking-wider text-white/45 font-semibold">
              Logo image URL
            </label>
            <div className="flex gap-2 mt-1.5">
              <input
                type="url"
                inputMode="url"
                placeholder="https://yoursite.com/logo.png"
                value={logoDraft}
                onChange={(e) => setLogoDraft(e.target.value)}
                onBlur={applyLogo}
                onKeyDown={(e) => e.key === 'Enter' && applyLogo()}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.14)' }}
              />
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoDraft('');
                    onLogoChange('');
                    setError(null);
                  }}
                  className="px-3 py-2 rounded-lg text-sm text-white/70 cursor-pointer bg-transparent"
                  style={{ border: '1px solid rgba(255,255,255,0.14)' }}
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[0.72rem] text-white/40 mt-1.5 leading-relaxed">
              Paste a public PNG URL — we don&apos;t host images. The host must
              send CORS headers (Access-Control-Allow-Origin) or PNG export
              will fail. SVG export always works.
            </p>
          </div>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            <button
              type="button"
              onClick={() => download('png')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer border-none"
              style={{ background: 'linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)', boxShadow: '0 4px 14px rgba(155,123,247,0.35)' }}
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => download('svg')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white/85 cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'transparent' }}
            >
              Download SVG
            </button>
          </div>
        </div>
      </div>

      {/* Style catalog */}
      <div>
        <div className="text-[0.7rem] uppercase tracking-wider text-white/45 font-semibold mb-2.5">
          Style
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {QR_PRESETS.map((p) => {
            const selected = p.id === presetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                title={p.name}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all bg-transparent"
                style={{
                  border: selected
                    ? `1px solid ${ACCENT}`
                    : '1px solid rgba(255,255,255,0.08)',
                  background: selected ? 'rgba(155,123,247,0.1)' : 'transparent',
                }}
              >
                <ThumbQr preset={p} data={shortUrl} />
                <span
                  className="text-[0.62rem] font-medium truncate w-full text-center"
                  style={{ color: selected ? '#c8b6ff' : 'rgba(255,255,255,0.6)' }}
                >
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Small catalog thumbnail — its own lightweight instance (no logo). */
function ThumbQr({ preset, data }: { preset: (typeof QR_PRESETS)[number]; data: string }) {
  const options = useMemo(
    () => buildQrOptions(preset, { data, size: 160 }),
    [preset, data],
  );
  return (
    <div
      className="rounded-md overflow-hidden flex items-center justify-center"
      style={{ width: 52, height: 52, background: '#fff', padding: 3 }}
    >
      <StyledQr options={options} display={46} />
    </div>
  );
}
