import { SITE_TIPS } from '../src/utils/siteTips';

export default function Loading() {
  const day = Math.floor(Date.now() / 86_400_000);
  const tip = SITE_TIPS[day % SITE_TIPS.length];

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-sm text-center" role="status" aria-live="polite">
        <div className="relative mx-auto mb-6 h-12 w-12">
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'var(--accent)' }} />
          <div className="absolute inset-1 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            <ion-icon name="sparkles-outline" style={{ fontSize: '20px' }} />
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>While you wait</p>
        <p className="mt-2 text-[14px] leading-6" style={{ color: 'var(--text-muted)' }}>{tip}</p>
        <div className="mx-auto mt-6 h-1 w-32 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        </div>
      </div>
    </main>
  );
}
