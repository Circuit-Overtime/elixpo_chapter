'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

function FloatingTOC({ headings }) {
  const [activeId, setActiveId] = useState('');
  const listRef = useRef(null);
  const itemRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState({ top: 0, height: 16 });

  useEffect(() => {
    const els = headings.map(h => document.getElementById(h.id)).filter(Boolean);
    if (els.length === 0) return;

    const onScroll = () => {
      const scrollY = window.scrollY + 120;
      let current = headings[0]?.id || '';
      for (const el of els) {
        if (el.offsetTop <= scrollY) current = el.id;
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  // Update slider position based on active item's DOM position
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const item = itemRefs.current[activeId];
    if (!item) return;
    const listRect = listRef.current.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setSliderStyle({
      top: itemRect.top - listRect.top,
      height: itemRect.height,
    });
  }, [activeId]);

  return (
    <nav className="preview-floating-toc">
      <p className="preview-floating-toc-label">On this page</p>
      <div className="relative flex">
        {/* Track line + slider */}
        <div className="relative mr-3 flex-shrink-0" style={{ width: '2px' }}>
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--border-default)' }} />
          <div
            className="absolute left-0 w-full rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: '#9b7bf7',
              top: sliderStyle.top,
              height: sliderStyle.height,
            }}
          />
        </div>
        <ul className="preview-floating-toc-list flex-1" ref={listRef}>
          {headings.map(h => (
            <li key={h.id} ref={el => { itemRefs.current[h.id] = el; }}>
              <a
                href={`#${h.id}`}
                className="preview-floating-toc-link"
                style={{
                  paddingLeft: (h.level - 1) * 12,
                  color: h.id === activeId ? 'var(--text-primary)' : undefined,
                  fontWeight: h.id === activeId ? '600' : undefined,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function renderBlocksToHTML(blocks) {
  if (!blocks || !blocks.length) return '';
  const parts = [];

  function inlineToHTML(content) {
    if (!content || !Array.isArray(content)) return '';
    return content.map((c) => {
      if (c.type === 'inlineEquation' && c.props?.latex) {
        return `<span class="preview-inline-equation" data-latex="${encodeURIComponent(c.props.latex)}"></span>`;
      }
      if (c.type === 'mention' && c.props?.username) {
        const name = c.props.displayName || c.props.username;
        const avatar = c.props.avatarUrl
          ? `<img src="${c.props.avatarUrl}" alt="" class="mention-chip-avatar">`
          : `<span class="mention-chip-initial">${(name || '?')[0].toUpperCase()}</span>`;
        return `<a href="/${c.props.username}" class="mention-chip">${avatar}@${name}</a>`;
      }
      if (c.type === 'blogMention' && c.props?.slugid) {
        return `<a href="/${c.props.slugid}" class="mention-chip">${c.props.title || 'Untitled blog'}</a>`;
      }
      if (c.type === 'orgMention' && c.props?.slug) {
        return `<a href="/${c.props.slug}" class="mention-chip">@${c.props.name || c.props.slug}</a>`;
      }
      let text = (c.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!text) return '';
      const s = c.styles || {};
      if (s.bold) text = `<strong>${text}</strong>`;
      if (s.italic) text = `<em>${text}</em>`;
      if (s.strike) text = `<del>${text}</del>`;
      if (s.code) text = `<code>${text}</code>`;
      if (s.underline) text = `<u>${text}</u>`;
      if (c.type === 'link' && c.href) text = `<a href="${c.href}">${text}</a>`;
      if (s.textColor) text = `<span style="color:${s.textColor}">${text}</span>`;
      if (s.backgroundColor) text = `<span style="background:${s.backgroundColor};border-radius:3px;padding:0 2px">${text}</span>`;
      return text;
    }).join('');
  }

  // Collect headings for TOC
  const headings = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      const text = (block.content || []).map(c => c.text || '').join('');
      if (text.trim()) {
        const id = `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`;
        headings.push({ id, text: text.trim(), level: block.props?.level || 1 });
      }
    }
  }

  for (const block of blocks) {
    const content = inlineToHTML(block.content);
    switch (block.type) {
      case 'tableOfContents':
        // Placeholder — will be replaced with actual TOC after all headings are collected
        parts.push('__TOC_PLACEHOLDER__');
        break;
      case 'heading': {
        const level = block.props?.level || 1;
        const text = (block.content || []).map(c => c.text || '').join('');
        const id = `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`;
        parts.push(`<h${level} id="${id}">${content}</h${level}>`);
        break;
      }
      case 'bulletListItem':
        parts.push(`<li class="preview-bullet">${content}</li>`);
        break;
      case 'numberedListItem':
        parts.push(`<li class="preview-numbered">${content}</li>`);
        break;
      case 'checkListItem':
        parts.push(`<li class="preview-check">${block.props?.checked ? '&#9745; ' : '&#9744; '}${content}</li>`);
        break;
      case 'blockEquation':
        if (block.props?.latex) {
          parts.push(`<div class="preview-block-equation" data-latex="${encodeURIComponent(block.props.latex)}"></div>`);
        }
        break;
      case 'mermaidBlock':
        if (block.props?.diagram) {
          parts.push(`<div class="preview-mermaid-block" data-diagram="${encodeURIComponent(block.props.diagram)}"></div>`);
        }
        break;
      case 'divider':
        parts.push('<hr class="preview-divider" />');
        break;
      case 'codeBlock': {
        const lang = block.props?.language || '';
        const code = (block.content || []).map((c) => c.text || '').join('');
        parts.push(`<pre><code class="language-${lang}">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        break;
      }
      case 'image':
        if (block.props?.url) {
          parts.push(`<figure><img src="${block.props.url}" alt="${block.props?.caption || ''}" />${block.props?.caption ? `<figcaption>${block.props.caption}</figcaption>` : ''}</figure>`);
        }
        break;
      case 'table': {
        const tableContent = block.content;
        const rows = tableContent?.rows || [];
        if (rows.length) {
          const headerRows = tableContent?.headerRows || 0;
          let table = '<table>';
          rows.forEach((row, ri) => {
            table += '<tr>';
            (row.cells || []).forEach((cell) => {
              const tag = ri < headerRows ? 'th' : 'td';
              // cell can be InlineContent[] or TableCell { type, props, content }
              let cellContent;
              if (Array.isArray(cell)) {
                cellContent = cell;
              } else if (cell && typeof cell === 'object' && cell.content) {
                cellContent = Array.isArray(cell.content) ? cell.content : [];
              } else {
                cellContent = [];
              }
              const cellHTML = inlineToHTML(cellContent);
              table += `<${tag}>${cellHTML}</${tag}>`;
            });
            table += '</tr>';
          });
          table += '</table>';
          parts.push(table);
        }
        break;
      }
      case 'paragraph':
      default:
        if (content) {
          parts.push(`<p>${content}</p>`);
        }
        break;
    }
  }

  // TOC is rendered as a floating sidebar in the component, not in the HTML
  let tocHTML = '';

  // Wrap consecutive bullet/numbered items in lists
  let html = parts.join('\n');
  html = html.replace(/((?:<li class="preview-bullet">.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<li class="preview-numbered">.*?<\/li>\n?)+)/g, '<ol>$1</ol>');

  // Remove TOC placeholder (rendered separately as floating sidebar)
  html = html.replace('__TOC_PLACEHOLDER__', '');

  return html;
}

export default function BlogPreview({ title, subtitle, coverPreview, coverZoom, coverPos, pageEmoji, tags, html, blocks, user, org, coAuthorCount, wordCount }) {
  const { isDark } = useTheme();
  const contentRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Determine which HTML to use — prefer blocks-based rendering
  const renderedHTML = blocks && blocks.length > 0 ? renderBlocksToHTML(blocks) : html;

  // Extract headings for floating TOC
  const headings = (blocks || [])
    .filter(b => b.type === 'heading' && b.content?.length > 0)
    .map(b => {
      const text = b.content.map(c => c.text || '').join('');
      return { id: `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`, text: text.trim(), level: b.props?.level || 1 };
    })
    .filter(h => h.text);

  // Render KaTeX equations and mermaid diagrams after mount
  useEffect(() => {
    if (!contentRef.current) return;
    let cancelled = false;

    // Strip \[...\], $$...$$, \(...\), $...$ wrappers — KaTeX expects inner expression only
    function stripDelimiters(raw) {
      let s = raw.trim();
      if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
      if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
      if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
      if (s.startsWith('$') && s.endsWith('$') && s.length > 2) return s.slice(1, -1).trim();
      return s;
    }

    // Render block equations
    const eqEls = contentRef.current.querySelectorAll('.preview-block-equation[data-latex]');
    if (eqEls.length) {
      import('katex').then(({ default: katex }) => {
        if (cancelled) return;
        eqEls.forEach((el) => {
          try {
            const latex = stripDelimiters(decodeURIComponent(el.dataset.latex));
            el.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false });
          } catch (err) {
            el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
          }
        });
      });
    }

    // Render inline equations
    const inlineEls = contentRef.current.querySelectorAll('.preview-inline-equation[data-latex]');
    if (inlineEls.length) {
      import('katex').then(({ default: katex }) => {
        if (cancelled) return;
        inlineEls.forEach((el) => {
          try {
            const latex = stripDelimiters(decodeURIComponent(el.dataset.latex));
            el.innerHTML = katex.renderToString(latex, { displayMode: false, throwOnError: false });
          } catch (err) {
            el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
          }
        });
      });
    }

    // Render mermaid diagrams
    const mermaidEls = contentRef.current.querySelectorAll('.preview-mermaid-block[data-diagram]');
    if (mermaidEls.length) {
      import('mermaid').then(({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? {
            primaryColor: '#232d3f',
            primaryTextColor: '#e4e4e7',
            primaryBorderColor: '#c4b5fd',
            lineColor: '#8b8fa3',
            secondaryColor: '#1e1e2e',
            tertiaryColor: '#141a26',
            fontFamily: "'lixFont', sans-serif",
            fontSize: '16px',
          } : {
            primaryColor: '#e8e0ff',
            primaryTextColor: '#1a1a2e',
            primaryBorderColor: '#7c5cbf',
            lineColor: '#6b7280',
            secondaryColor: '#f3f0ff',
            tertiaryColor: '#f9fafb',
            fontFamily: "'lixFont', sans-serif",
            fontSize: '16px',
          },
          flowchart: { useMaxWidth: false, padding: 20, nodeSpacing: 50, rankSpacing: 60 },
        });
        // Render diagrams sequentially — mermaid is a singleton, concurrent renders cause conflicts
        (async () => {
          for (const el of mermaidEls) {
            if (cancelled) return;
            try {
              const diagram = decodeURIComponent(el.dataset.diagram);
              const id = `preview-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const { svg } = await mermaid.render(id, diagram.trim());
              el.innerHTML = svg;
              const svgEl = el.querySelector('svg');
              if (svgEl) {
                svgEl.removeAttribute('width');
                svgEl.style.width = '100%';
                svgEl.style.maxWidth = 'none';
                svgEl.style.height = 'auto';
                svgEl.style.minHeight = '180px';
              }
            } catch (err) {
              el.innerHTML = `<pre style="color:#f87171;font-size:12px">${err.message || 'Diagram error'}</pre>`;
            }
          }
        })();
      });
    }

    return () => { cancelled = true; };
  }, [renderedHTML, isDark]);

  return (
    <div className="blog-preview" id="blog-preview-top">
      {/* Floating TOC with scroll spy */}
      {headings.length >= 2 && <FloatingTOC headings={headings} />}

      {/* Back to top — only visible after scrolling down */}
      {showBackToTop && (
        <button
          className="preview-back-to-top"
          onClick={() => document.getElementById('blog-preview-top')?.scrollIntoView({ behavior: 'smooth' })}
          title="Back to top"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      )}
      {/* Cover + emoji */}
      <div className="relative mb-2">
        {coverPreview && (
          <div className="rounded-xl overflow-hidden" style={{ height: '220px' }}>
            <img
              src={coverPreview}
              alt="Cover"
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${coverPos?.x ?? 50}% ${coverPos?.y ?? 50}%`,
                transform: `scale(${coverZoom || 1})`,
              }}
            />
          </div>
        )}

        {pageEmoji && (
          <div
            style={{
              position: coverPreview ? 'absolute' : 'relative',
              bottom: coverPreview ? '-24px' : 'auto',
              left: '16px',
              zIndex: 10,
            }}
          >
            <div className="w-[72px] h-[72px] rounded-full bg-[var(--bg-app)] border-[3px] border-[var(--bg-app)] shadow-lg flex items-center justify-center relative">
              <span className="text-[42px] leading-none select-none">{pageEmoji}</span>
              <div className="absolute inset-[-2px] rounded-full border border-[var(--border-default)]" />
            </div>
          </div>
        )}
      </div>

      {/* Spacer when emoji overlaps cover */}
      {pageEmoji && coverPreview && <div className="h-8" />}

      {/* Author bar — above title */}
      {user && (
        <div className="flex items-center gap-3 mt-3 mb-5">
          <div className="flex -space-x-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-[var(--bg-app)]" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--bg-app)] flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)]">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-faint)] flex-wrap">
            {org && (
              <>
                <span className="text-[var(--text-secondary)] font-medium">{org.name}</span>
                <span className="text-[var(--text-faint)]">·</span>
              </>
            )}
            <span className="text-[var(--text-muted)] font-medium">{user.display_name || user.username || 'Author'}</span>
            {coAuthorCount > 0 && (
              <span className="text-[var(--text-faint)]">+ {coAuthorCount} {coAuthorCount === 1 ? 'other' : 'others'}</span>
            )}
            <span className="text-[var(--text-faint)]">·</span>
            <span>{Math.max(1, Math.ceil((wordCount || 0) / 200))} min read</span>
            <span className="text-[var(--text-faint)]">·</span>
            <span>{wordCount || 0} {(wordCount || 0) === 1 ? 'word' : 'words'}</span>
          </div>
        </div>
      )}

      {/* Tags — under author bar */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 bg-[#9b7bf70a] rounded-full text-[12px] text-[#9b7bf7]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Gap before title */}
      <div style={{ height: '48px' }} />

      {title && (
        <h1 className="text-[2.2em] font-extrabold leading-tight mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>{title}</h1>
      )}

      {subtitle && (
        <p className="text-xl mb-5" style={{ color: 'var(--text-muted)', fontFamily: "'Source Serif 4', Georgia, serif" }}>{subtitle}</p>
      )}

      <div className="mt-4">
        {renderedHTML ? (
          <div
            ref={contentRef}
            className="blog-preview-content max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        ) : (
          <p className="text-[var(--text-faint)] italic">Start writing to see a preview...</p>
        )}
      </div>
    </div>
  );
}
