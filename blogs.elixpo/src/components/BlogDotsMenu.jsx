'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
export default function BlogDotsMenu({ blogId, authorId, author = {}, org = null, tags = [], hideHighlights, onToggleHighlights }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fAuthor, setFAuthor] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [fOrg, setFOrg] = useState(false);
  const [done, setDone] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Ctrl/Cmd + / toggles highlights.
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); onToggleHighlights?.(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onToggleHighlights]);

  // Resolve follow state on open.
  useEffect(() => {
    if (!open || !user) return;
    if (author?.username) fetch(`/api/users/${author.username}/follow`).then(r => r.ok ? r.json() : null).then(d => { if (d) { setFAuthor(!!d.following); setIsSelf(!!d.self); } }).catch(() => {});
    if (org?.slug) fetch(`/api/orgs/${org.slug}/follow`).then(r => r.ok ? r.json() : null).then(d => d && setFOrg(!!d.following)).catch(() => {});
  }, [open, user]);

  const needAuth = () => { if (!user) { window.location.href = `/sign-in?next=${typeof window !== 'undefined' ? window.location.pathname : '/'}`; return true; } return false; };
  const post_ = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  const flash = (m) => { setDone(m); setTimeout(() => { setDone(''); setOpen(false); }, 900); };

  const showLess = () => { if (needAuth()) return; post_('/api/signals', { blogId, tags, type: 'show_less', weight: -2 }); flash('We’ll show you less like this'); };
  const toggleHi = () => { onToggleHighlights?.(); setOpen(false); };
  const followAuthor = () => { if (needAuth() || fAuthor) return; setFAuthor(true); post_(`/api/users/${author.username}/follow`); flash('Following'); };
  const followOrg = () => { if (needAuth() || fOrg) return; setFOrg(true); post_(`/api/orgs/${org.slug}/follow`); flash('Following'); };
  const muteAuthor = () => { if (needAuth()) return; post_('/api/mutes', { targetType: 'author', targetId: authorId }); flash('Author muted'); };
  const muteOrg = () => { if (needAuth()) return; post_('/api/mutes', { targetType: 'org', targetId: org.id }); flash('Publication muted'); };
  const muteTopics = () => { if (needAuth()) return; tags.forEach(t => post_('/api/mutes', { targetType: 'tag', targetId: t })); flash('Topics muted'); };
  const report = () => { if (needAuth()) return; setOpen(false); if (!confirm('Report this story to the moderators?')) return; post_(`/api/blogs/${blogId}/report`, { reason: 'other', detail: 'Reported from reader' }); };

  const Row = ({ icon, label, onClick, danger, badge, disabled, kbd }) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className="w-full text-left px-4 py-2 text-[14px] flex items-center gap-3 transition-colors"
      style={{ color: danger ? '#ef4444' : 'var(--text-body)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      {icon && <ion-icon name={icon} style={{ fontSize: '17px', color: danger ? '#ef4444' : 'var(--text-faint)' }} />}
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#16a34a', color: '#fff' }}>New</span>}
      {kbd && <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-faint)', border: '1px solid var(--border-default)' }}>{kbd}</kbd>}
    </button>
  );
  const Divider = () => <div className="my-1.5" style={{ borderTop: '1px solid var(--divider)' }} />;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-center w-9 h-9 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }} title="More" onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        <ion-icon name="ellipsis-horizontal" style={{ fontSize: '20px' }} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-11 z-50 w-64 rounded-xl py-1.5" style={{ backgroundColor: 'var(--dropdown-bg, var(--bg-surface))', border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
          {done ? (
            <div className="px-4 py-3 text-[13px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <ion-icon name="checkmark-circle" style={{ fontSize: '16px', color: '#16a34a' }} /> {done}
            </div>
          ) : (
            <>
              {!isSelf && <Row icon="thumbs-down-outline" label="Show less like this" onClick={showLess} />}
              <Row icon={hideHighlights ? 'eye-outline' : 'color-wand-outline'} label={hideHighlights ? 'Show highlights' : 'Hide highlights'} onClick={toggleHi} kbd="Ctrl /" />
              <Divider />
              {!isSelf && <Row label={fAuthor ? `Following ${author.display_name || author.username}` : `Follow ${author.display_name || author.username}`} onClick={followAuthor} disabled={fAuthor} />}
              {org && <Row label={fOrg ? `Following ${org.name}` : `Follow ${org.name}`} onClick={followOrg} disabled={fOrg} />}
              <Divider />
              {!isSelf && <Row label="Mute author" onClick={muteAuthor} />}
              {org && <Row label="Mute publication" onClick={muteOrg} />}
              {tags.length > 0 && <Row label="Mute topics" onClick={muteTopics} badge />}
              <Divider />
              {!isSelf && <Row label="Report story…" onClick={report} danger />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
