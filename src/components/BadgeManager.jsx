'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreatorBadgeMark } from './CreatorBadge';

export default function BadgeManager() {
  const [badges, setBadges] = useState([]);
  const [progress, setProgress] = useState([]);
  const [newlyEarned, setNewlyEarned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/badges', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setBadges(data.badges || []);
        setProgress(data.progress || []);
        setNewlyEarned(data.newlyEarned || []);
      })
      .catch(() => setError('Badge progress is temporarily unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  const nextBadges = useMemo(() => progress
    .filter((item) => !item.earned && item.target)
    .sort((a, b) => (b.value / b.target) - (a.value / a.target))
    .slice(0, 3), [progress]);

  async function updateBadge(badge, changes) {
    setBusyId(badge.id);
    setError('');
    try {
      const response = await fetch('/api/badges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeId: badge.id,
          visible: changes.visible ?? !!badge.visible,
          pinnedPosition: changes.pinnedPosition !== undefined ? changes.pinnedPosition : badge.pinned_position,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update badge');
      setBadges(data.badges || []);
    } catch (requestError) {
      setError(requestError.message || 'Could not update badge');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section id="creator-badges" className="mb-8 scroll-mt-20 rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>Creator badges</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>New awards are private. Show the ones you want visitors to see and pin up to three.</p>
        </div>
        <Link href="/badges" className="shrink-0 text-[12px] font-medium text-[#9b7bf7] hover:opacity-75">How badges work</Link>
      </div>

      {newlyEarned.length > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border-default))' }}>
          <div className="flex shrink-0 -space-x-2">
            {newlyEarned.slice(0, 3).map((badge) => <CreatorBadgeMark key={badge.id} badge={badge} size={36} />)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>You earned {newlyEarned.length === 1 ? newlyEarned[0].name : `${newlyEarned.length} new badges`}.</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>They remain hidden until you choose to display them.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />)}
        </div>
      ) : badges.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => (
            <article key={badge.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)' }}>
              <CreatorBadgeMark badge={badge} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{badge.name}</p>
                <p className="truncate text-[10px]" style={{ color: 'var(--text-faint)' }}>Earned {new Date(badge.awarded_at * 1000).toLocaleDateString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {badge.visible ? (
                  <select
                    value={badge.pinned_position || ''}
                    disabled={busyId === badge.id}
                    onChange={(event) => updateBadge(badge, { pinnedPosition: event.target.value ? Number(event.target.value) : null })}
                    className="rounded-md px-1.5 py-1 text-[10px] outline-none"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                    aria-label={`Pin position for ${badge.name}`}
                  >
                    <option value="">Not pinned</option>
                    <option value="1">Pin 1</option>
                    <option value="2">Pin 2</option>
                    <option value="3">Pin 3</option>
                  </select>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === badge.id}
                  onClick={() => updateBadge(badge, { visible: !badge.visible, pinnedPosition: badge.visible ? null : badge.pinned_position })}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50"
                  aria-pressed={!!badge.visible}
                  style={badge.visible
                    ? { color: '#4ade80', backgroundColor: '#4ade8014', border: '1px solid #4ade8033' }
                    : { color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {badge.visible ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed p-4" style={{ borderColor: 'var(--border-default)' }}>
          <CreatorBadgeMark badge={{ icon: 'ribbon-outline' }} size={42} muted />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Your first badge will appear here</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Publish, collaborate, and build an audience to unlock creator milestones.</p>
          </div>
        </div>
      )}

      {nextBadges.length > 0 && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Closest milestones</p>
          <div className="space-y-3">
            {nextBadges.map((badge) => {
              const percent = Math.min(100, Math.round((badge.value / badge.target) * 100));
              return (
                <div key={badge.id}>
                  <div className="mb-1 flex justify-between gap-3 text-[11px]">
                    <span style={{ color: 'var(--text-body)' }}>{badge.name}</span>
                    <span style={{ color: 'var(--text-faint)' }}>{badge.value}/{badge.target}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]"><div className="h-full rounded-full bg-[#9b7bf7]" style={{ width: `${percent}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="mt-4 text-[11px] text-red-400">{error}</p>}
    </section>
  );
}
