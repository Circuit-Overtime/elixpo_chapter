'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// A <textarea> with @username autocomplete (#10). Reuses /api/search?scope=users.
// Drop-in: same value/onChange/placeholder/rows/className/style/onKeyDown props.
// On select, replaces the active "@query" token with "@username ".
export default function MentionTextarea({
  value, onChange, placeholder, rows = 2, className, style, onKeyDown, autoFocus,
}) {
  const taRef = useRef(null);
  const [menu, setMenu] = useState(null); // { query, start, results, active }
  const debounceRef = useRef(null);

  // Find an @token immediately before the caret (no whitespace inside).
  const detect = useCallback((el) => {
    const caret = el.selectionStart;
    const upto = el.value.slice(0, caret);
    const m = upto.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
    if (!m) return null;
    return { query: m[1], start: caret - m[1].length - 1 }; // index of '@'
  }, []);

  useEffect(() => {
    if (!menu || menu.query == null) return;
    clearTimeout(debounceRef.current);
    if (menu.query.length < 1) { setMenu((p) => p && { ...p, results: [] }); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(menu.query)}&scope=users`);
        const data = res.ok ? await res.json() : { users: [] };
        setMenu((p) => p && { ...p, results: (data.users || []).slice(0, 6), active: 0 });
      } catch { setMenu((p) => p && { ...p, results: [] }); }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [menu?.query]);

  const handleChange = (e) => {
    onChange(e);
    const d = detect(e.target);
    setMenu(d ? { ...d, results: [], active: 0 } : null);
  };

  const pick = (u) => {
    const el = taRef.current;
    if (!el || !menu) return;
    const before = value.slice(0, menu.start);
    const after = value.slice(el.selectionStart);
    const next = `${before}@${u.username} ${after}`;
    // Synthesize a change event so the parent state updates.
    onChange({ target: { value: next } });
    setMenu(null);
    requestAnimationFrame(() => {
      const pos = (before + `@${u.username} `).length;
      try { el.focus(); el.setSelectionRange(pos, pos); } catch {}
    });
  };

  const handleKeyDown = (e) => {
    if (menu && menu.results?.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu((p) => ({ ...p, active: (p.active + 1) % p.results.length })); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu((p) => ({ ...p, active: (p.active - 1 + p.results.length) % p.results.length })); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(menu.results[menu.active]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMenu(null); return; }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative" style={{ flex: style?.flex }}>
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMenu(null), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        style={style}
        autoFocus={autoFocus}
      />
      {menu && menu.results?.length > 0 && (
        <div
          className="absolute left-0 z-50 mt-1 w-64 rounded-lg overflow-hidden"
          style={{ top: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
        >
          {menu.results.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(u); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left"
              style={{ background: i === menu.active ? 'var(--bg-active)' : 'transparent' }}
            >
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{(u.display_name || u.username || '?')[0].toUpperCase()}</span>}
              <span className="min-w-0">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.display_name || u.username}</span>
                <span className="block text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>@{u.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Linkify @username tokens that resolved to real users (passed as a Set/array
// of usernames). Returns an array of strings + <a> nodes for React rendering.
export function renderMentions(text, mentioned, LinkComp) {
  if (!text) return text;
  const set = new Set((mentioned || []).map((u) => u.toLowerCase()));
  if (set.size === 0) return text;
  const parts = [];
  const re = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_-]+)/g;
  let last = 0; let m; let key = 0;
  while ((m = re.exec(text)) !== null) {
    const uname = m[2];
    if (!set.has(uname.toLowerCase())) continue;
    const at = m.index + m[1].length;
    if (at > last) parts.push(text.slice(last, at));
    const A = LinkComp || 'a';
    parts.push(
      <A key={`m${key++}`} href={`/${uname}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>@{uname}</A>,
    );
    last = at + uname.length + 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}
