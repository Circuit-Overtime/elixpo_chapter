'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { CSSProperties } from 'react';
import type { Options } from 'qr-code-styling';

export interface StyledQrHandle {
  /** QR is always exported as SVG (vector). */
  download: () => Promise<void>;
}

interface Props {
  options: Options;
  /** CSS display size in px (the canvas backbuffer comes from options.width). */
  display: number;
  filename?: string;
  className?: string;
  style?: CSSProperties;
  onError?: (message: string) => void;
}

/**
 * Renders a qr-code-styling instance. The library is browser-only (canvas /
 * DOMParser), so it's dynamically imported inside an effect — it never runs
 * during SSR on the Cloudflare edge. The canvas backbuffer stays at
 * options.width for crisp downloads while CSS scales it to `display`.
 */
const StyledQr = forwardRef<StyledQrHandle, Props>(function StyledQr(
  { options, display, filename = 'elixpourl-qr', className, style, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null);

  // Create the instance once, then keep it updated below.
  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    import('qr-code-styling')
      .then(({ default: QRCodeStyling }) => {
        if (!mounted || !container) return;
        qrRef.current = new QRCodeStyling(options);
        container.innerHTML = '';
        qrRef.current.append(container);
        // Force the appended node (svg) to fill the (smaller) display box.
        const el = container.querySelector('svg, canvas') as HTMLElement | null;
        if (el) {
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.display = 'block';
        }
      })
      .catch(() => onError?.('QR renderer failed to load'));
    return () => {
      mounted = false;
      if (container) container.innerHTML = '';
    };
    // Create-once: later option changes go through the update effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    qrRef.current?.update(options);
  }, [options]);

  useImperativeHandle(
    ref,
    () => ({
      download: async () => {
        if (!qrRef.current) return;
        try {
          await Promise.resolve(qrRef.current.download({ name: filename, extension: 'svg' }));
        } catch {
          onError?.('SVG export failed — check the logo image URL is reachable.');
        }
      },
    }),
    [filename, onError],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: display, height: display, ...style }}
    />
  );
});

export default StyledQr;
