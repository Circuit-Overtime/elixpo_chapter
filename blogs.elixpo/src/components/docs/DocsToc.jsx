'use client';

import { useEffect, useState } from 'react';

export default function DocsToc({ headings }) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return <aside className="hidden lg:block w-48 flex-shrink-0" />;

  return (
    <aside className="hidden lg:block w-48 flex-shrink-0 sticky top-20 self-start pl-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
        On this page
      </h4>
      <ul className="space-y-1.5 border-l" style={{ borderColor: 'var(--border-default)' }}>
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? '1.5rem' : '0.75rem' }}>
            <a
              href={`#${h.id}`}
              className="block text-[12.5px] leading-snug transition-colors"
              style={{ color: activeId === h.id ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
