'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import LinkPreviewTooltip, { useLinkPreview } from './LinkPreviewTooltip';

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

  // Update slider position and auto-scroll TOC to keep active item visible
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
    // Scroll the TOC list so the active item stays visible
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
                className={`preview-floating-toc-link${h.isSubpage ? ' toc-subpage-link' : ''}`}
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
                {h.isSubpage && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                )}
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

  function inlineToHTML(content) {
    if (!content || !Array.isArray(content)) return '';
    return content.map((c) => {
      if (c.type === 'inlineEquation' && c.props?.latex) {
        return `<span class="preview-inline-equation" data-latex="${encodeURIComponent(c.props.latex)}"></span>`;
      }
      if (c.type === 'dateInline' && c.props?.date) {
        let formatted;
        try { formatted = new Date(c.props.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { formatted = c.props.date; }
        return `<span class="preview-date-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${formatted}</span>`;
      }
      if (c.type === 'mention' && c.props?.username) {
        const name = c.props.displayName || c.props.username;
        const avatar = c.props.avatarUrl
          ? `<img src="${c.props.avatarUrl}" alt="" class="mention-chip-avatar">`
          : `<span class="mention-chip-initial">${(name || '?')[0].toUpperCase()}</span>`;
        return `<a href="/@${c.props.username}" class="mention-chip" data-username="${c.props.username}" data-avatar="${c.props.avatarUrl || ''}" data-displayname="${name}">${avatar}@${name}</a>`;
      }
      if (c.type === 'blogMention' && c.props?.slugid) {
        return `<a href="/${c.props.slugid}" class="blog-mention-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>${c.props.title || 'Untitled blog'}</a>`;
      }
      if (c.type === 'orgMention' && c.props?.slug) {
        return `<a href="/@${c.props.slug}" class="org-mention-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>@${c.props.name || c.props.slug}</a>`;
      }
      // Links wrap child content — recurse into c.content for the link text
      if (c.type === 'link' && c.href) {
        const linkText = c.content ? inlineToHTML(c.content) : (c.text || c.href).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<a href="${c.href}">${linkText || c.href}</a>`;
      }
      let text = (c.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!text) return '';
      const s = c.styles || {};
      if (s.bold) text = `<strong>${text}</strong>`;
      if (s.italic) text = `<em>${text}</em>`;
      if (s.strike) text = `<del>${text}</del>`;
      if (s.code) text = `<code>${text}</code>`;
      if (s.underline) text = `<u>${text}</u>`;
      if (s.textColor) text = `<span style="color:${s.textColor}">${text}</span>`;
      if (s.backgroundColor) text = `<span style="background:${s.backgroundColor};border-radius:3px;padding:0 2px">${text}</span>`;
      return text;
    }).join('');
  }

  // Collect ALL headings + subpages recursively for TOC
  const headings = [];
  function collectHeadings(blockList) {
    for (const block of blockList) {
      if (block.type === 'heading') {
        const text = (block.content || []).map(c => c.text || '').join('');
        if (text.trim()) {
          const id = `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`;
          headings.push({ id, text: text.trim(), level: block.props?.level || 1 });
        }
      }
      if (block.type === 'tabsBlock') {
        let subTabs = [];
        try { subTabs = JSON.parse(block.props?.tabs || '[]'); } catch {}
        subTabs.forEach(t => {
          if (t.title) {
            const id = `subpage-${(t.subpageId || t.title).slice(0, 20)}`;
            headings.push({ id, text: t.title, level: 2, isSubpage: true, subpageId: t.subpageId });
          }
        });
      }
      if (block.children?.length) collectHeadings(block.children);
    }
  }
  collectHeadings(blocks);

  // Render a single block to HTML, recursing into children
  function renderBlock(block) {
    const content = inlineToHTML(block.content);
    const childrenHTML = block.children?.length ? renderListGroup(block.children) : '';

    switch (block.type) {
      case 'tableOfContents':
        return '__TOC_PLACEHOLDER__';
      case 'heading': {
        const level = block.props?.level || 1;
        const text = (block.content || []).map(c => c.text || '').join('');
        const id = `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`;
        return `<h${level} id="${id}">${content}</h${level}>${childrenHTML}`;
      }
      case 'bulletListItem':
        return `<li class="preview-bullet">${content}${childrenHTML}</li>`;
      case 'numberedListItem':
        return `<li class="preview-numbered">${content}${childrenHTML}</li>`;
      case 'checkListItem': {
        const checked = !!block.props?.checked;
        const checkboxHTML = `<span class="preview-checkbox${checked ? ' preview-checkbox--checked' : ''}"><span class="preview-checkbox-icon">${checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span></span>`;
        return `<li class="preview-check${checked ? ' preview-check--checked' : ''}">${checkboxHTML}<span class="preview-check-text">${content}</span>${childrenHTML}</li>`;
      }
      case 'blockEquation':
        if (block.props?.latex) {
          return `<div class="preview-block-equation" data-latex="${encodeURIComponent(block.props.latex)}"></div>${childrenHTML}`;
        }
        return childrenHTML;
      case 'mermaidBlock':
        if (block.props?.diagram) {
          return `<div class="preview-mermaid-block" data-diagram="${encodeURIComponent(block.props.diagram)}"></div>${childrenHTML}`;
        }
        return childrenHTML;
      case 'tabsBlock': {
        let subTabs = [];
        try { subTabs = JSON.parse(block.props?.tabs || '[]'); } catch {}
        if (subTabs.length === 0) return childrenHTML;
        const tabItems = subTabs.map(t => {
          const href = t.subpageId ? `/${t.subpageId}` : '#';
          const id = `subpage-${(t.subpageId || t.title).slice(0, 20)}`;
          return `<a id="${id}" href="${href}" class="subpage-item" target="_blank" rel="noopener"><div class="subpage-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg></div><span class="subpage-title">${t.title}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="subpage-arrow"><polyline points="9 18 15 12 9 6"/></svg></a>`;
        }).join('');
        return `<div class="subpage-block">${tabItems}</div>${childrenHTML}`;
      }
      case 'divider':
        return `<hr class="preview-divider" />${childrenHTML}`;
      case 'codeBlock': {
        const lang = block.props?.language || '';
        const code = (block.content || []).map((c) => c.text || '').join('');
        return `<pre><code class="language-${lang}">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>${childrenHTML}`;
      }
      case 'image':
        if (block.props?.url) {
          return `<figure><img src="${block.props.url}" alt="${block.props?.caption || ''}" />${block.props?.caption ? `<figcaption>${block.props.caption}</figcaption>` : ''}</figure>${childrenHTML}`;
        }
        return childrenHTML;
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
          return table + childrenHTML;
        }
        return childrenHTML;
      }
      case 'paragraph':
      default:
        if (content) {
          return `<p>${content}</p>${childrenHTML}`;
        }
        return childrenHTML || '';
    }
  }

  // Group consecutive list items of the same type into proper <ul>/<ol> wrappers
  function renderListGroup(blockList) {
    if (!blockList || !blockList.length) return '';
    const out = [];
    let i = 0;

    while (i < blockList.length) {
      const block = blockList[i];

      if (block.type === 'bulletListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'bulletListItem') {
          items += renderBlock(blockList[i]);
          i++;
        }
        out.push(`<ul>${items}</ul>`);
      } else if (block.type === 'numberedListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'numberedListItem') {
          items += renderBlock(blockList[i]);
          i++;
        }
        out.push(`<ol>${items}</ol>`);
      } else if (block.type === 'checkListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'checkListItem') {
          items += renderBlock(blockList[i]);
          i++;
        }
        out.push(`<ul class="preview-checklist">${items}</ul>`);
      } else {
        out.push(renderBlock(block));
        i++;
      }
    }
    return out.join('\n');
  }

  let html = renderListGroup(blocks);

  // Build inline TOC HTML matching the editor's toc-block style
  let tocHTML = '';
  if (headings.length > 0) {
    const tocItems = headings.map(h => {
      const indent = (h.level - 1) * 16;
      const icon = h.isSubpage ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:4px;vertical-align:-1px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' : '';
      return `<li><a href="#${h.id}" class="preview-toc-link${h.isSubpage ? ' toc-subpage-link' : ''}" style="padding-left:${indent}px">${icon}${h.text}</a></li>`;
    }).join('');
    tocHTML = `<div class="preview-toc-block"><p class="preview-toc-label">Table of Contents</p><ul class="preview-toc-list">${tocItems}</ul></div>`;
  }

  // Replace TOC placeholder with inline TOC block
  html = html.replace('__TOC_PLACEHOLDER__', tocHTML);

  return html;
}

export default function BlogPreview({ title, subtitle, coverPreview, coverZoom, coverPos, pageEmoji, tags, html, blocks, user, org, coAuthorCount, wordCount }) {
  const { isDark } = useTheme();
  const contentRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const linkPreview = useLinkPreview();
  const linkPreviewRef = useRef(linkPreview);
  linkPreviewRef.current = linkPreview;
  const [mentionCard, setMentionCard] = useState(null);
  const mentionTimerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Determine which HTML to use — prefer blocks-based rendering
  const renderedHTML = blocks && blocks.length > 0 ? renderBlocksToHTML(blocks) : html;

  // Extract headings + subpages for floating TOC
  const headings = (() => {
    const result = [];
    for (const b of (blocks || [])) {
      if (b.type === 'heading' && b.content?.length > 0) {
        const text = b.content.map(c => c.text || '').join('');
        if (text.trim()) {
          result.push({ id: `h-${text.trim().toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)}`, text: text.trim(), level: b.props?.level || 1 });
        }
      }
      if (b.type === 'tabsBlock') {
        let tabs = [];
        try { tabs = JSON.parse(b.props?.tabs || '[]'); } catch {}
        tabs.forEach(t => {
          if (t.title) {
            result.push({ id: `subpage-${(t.subpageId || t.title).slice(0, 20)}`, text: t.title, level: 2, isSubpage: true });
          }
        });
      }
    }
    return result;
  })();

  // Set innerHTML via ref so React never overwrites our post-processed DOM.
  // Then render KaTeX, mermaid, Shiki into the live DOM elements.
  const effectGenRef = useRef(0);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const gen = ++effectGenRef.current;

    // Set the base HTML — we own the DOM from here, React won't touch it
    root.innerHTML = renderedHTML || '';

    // Strip \[...\], $$...$$, \(...\), $...$ wrappers — KaTeX expects inner expression only
    function stripDelimiters(raw) {
      let s = raw.trim();
      if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
      if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
      if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
      if (s.startsWith('$') && s.endsWith('$') && s.length > 2) return s.slice(1, -1).trim();
      return s;
    }

    // Check if this effect is still the current one
    function isStale() { return effectGenRef.current !== gen; }

    // ── KaTeX: block + inline equations ──
    const eqEls = root.querySelectorAll('.preview-block-equation[data-latex]');
    const inlineEls = root.querySelectorAll('.preview-inline-equation[data-latex]');
    if (eqEls.length || inlineEls.length) {
      import('katex').then((mod) => {
        if (isStale()) return;
        const katex = mod.default || mod;
        eqEls.forEach((el) => {
          if (!el.isConnected) return;
          try {
            const latex = stripDelimiters(decodeURIComponent(el.dataset.latex));
            el.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false });
          } catch (err) {
            el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
          }
        });
        inlineEls.forEach((el) => {
          if (!el.isConnected) return;
          try {
            const latex = stripDelimiters(decodeURIComponent(el.dataset.latex));
            el.innerHTML = katex.renderToString(latex, { displayMode: false, throwOnError: false });
          } catch (err) {
            el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
          }
        });
      }).catch(() => {});
    }

    // ── Mermaid diagrams (matches editor MermaidBlock config) ──
    const mermaidEls = root.querySelectorAll('.preview-mermaid-block[data-diagram]');
    if (mermaidEls.length) {
      import('mermaid').then((mod) => {
        if (isStale()) return;
        const mermaid = mod.default || mod;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
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
            nodeTextColor: '#e4e4e7',
            nodeBorder: '#c4b5fd',
            mainBkg: '#232d3f',
            clusterBkg: '#1a1f2e',
            clusterBorder: '#333',
            titleColor: '#c4b5fd',
            edgeLabelBackground: '#141a26',
            git0: '#c4b5fd', git1: '#7c5cbf', git2: '#4ade80', git3: '#f59e0b',
            git4: '#ef4444', git5: '#3b82f6', git6: '#ec4899', git7: '#14b8a6',
            gitBranchLabel0: '#e4e4e7', gitBranchLabel1: '#e4e4e7',
            gitBranchLabel2: '#e4e4e7', gitBranchLabel3: '#e4e4e7',
            gitInv0: '#141a26',
          } : {
            primaryColor: '#e8e0ff',
            primaryTextColor: '#1a1a2e',
            primaryBorderColor: '#7c5cbf',
            lineColor: '#6b7280',
            secondaryColor: '#f3f0ff',
            tertiaryColor: '#f9fafb',
            fontFamily: "'lixFont', sans-serif",
            fontSize: '16px',
            nodeTextColor: '#1a1a2e',
            nodeBorder: '#7c5cbf',
            mainBkg: '#e8e0ff',
            clusterBkg: '#f3f0ff',
            clusterBorder: '#d1d5db',
            titleColor: '#7c5cbf',
            edgeLabelBackground: '#f9fafb',
            git0: '#7c5cbf', git1: '#9b7bf7', git2: '#16a34a', git3: '#d97706',
            git4: '#dc2626', git5: '#2563eb', git6: '#db2777', git7: '#0d9488',
          },
          flowchart: { padding: 20, nodeSpacing: 50, rankSpacing: 60, curve: 'basis', htmlLabels: true, useMaxWidth: false },
          sequence: { useMaxWidth: false, boxMargin: 10, noteMargin: 10, messageMargin: 35, mirrorActors: false },
          gitGraph: { showBranches: true, showCommitLabel: true, mainBranchName: 'main', rotateCommitLabel: false },
        });
        // Render all diagrams — don't bail early on stale, just skip applying to unmounted elements
        (async () => {
          for (const el of mermaidEls) {
            const id = `preview-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            try {
              let diagram = decodeURIComponent(el.dataset.diagram).trim();
              diagram = diagram.replace(/^\s*gitgraph/i, 'gitGraph');
              diagram = diagram.replace(/^\s*sequencediagram/i, 'sequenceDiagram');
              diagram = diagram.replace(/^\s*classDiagram/i, 'classDiagram');
              diagram = diagram.replace(/^\s*stateDiagram/i, 'stateDiagram');
              diagram = diagram.replace(/^\s*erDiagram/i, 'erDiagram');
              diagram = diagram.replace(/^\s*gantt/i, 'gantt');

              const tempDiv = document.createElement('div');
              tempDiv.id = 'container-' + id;
              tempDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;opacity:0;pointer-events:none;z-index:-9999;';
              document.body.appendChild(tempDiv);

              const { svg } = await mermaid.render(id, diagram, tempDiv);
              tempDiv.remove();

              // Only apply if element is still in the DOM and this is the current effect
              if (el.isConnected && !isStale()) {
                el.innerHTML = svg;
                const svgEl = el.querySelector('svg');
                if (svgEl) {
                  svgEl.removeAttribute('width');
                  svgEl.style.width = '100%';
                  svgEl.style.maxWidth = 'none';
                  svgEl.style.height = 'auto';
                  svgEl.style.minHeight = '180px';
                }
              }
            } catch (err) {
              if (el.isConnected && !isStale()) {
                el.innerHTML = `<pre style="color:#f87171;font-size:12px">${err.message || 'Diagram error'}</pre>`;
              }
              try { document.getElementById(id)?.remove(); } catch {}
              try { document.getElementById('container-' + id)?.remove(); } catch {}
            }
          }
        })();
      }).catch(() => {});
    }

    // ── Code blocks: Shiki syntax highlighting + language label + copy button ──
    const codeEls = root.querySelectorAll('pre > code[class*="language-"]');
    if (codeEls.length) {
      import('shiki').then(({ createHighlighter }) => {
        if (isStale()) return;
        const langs = new Set();
        codeEls.forEach((el) => {
          const m = el.className.match(/language-(\w+)/);
          if (m && m[1] && m[1] !== 'text') langs.add(m[1]);
        });
        return createHighlighter({
          themes: ['vitesse-dark', 'vitesse-light'],
          langs: [...langs],
        }).then((highlighter) => {
          if (isStale()) return;
          const shikiTheme = isDark ? 'vitesse-dark' : 'vitesse-light';
          codeEls.forEach((codeEl) => {
            const pre = codeEl.parentElement;
            if (!pre || pre.dataset.highlighted) return;
            pre.dataset.highlighted = 'true';
            const m = codeEl.className.match(/language-(\w+)/);
            const lang = m?.[1] || 'text';
            const code = codeEl.textContent || '';

            // Apply Shiki highlighting — use CSS vars for bg/color, only take token spans
            if (lang !== 'text' && langs.has(lang)) {
              try {
                const highlighted = highlighter.codeToHtml(code, { lang, theme: shikiTheme });
                const tmp = document.createElement('div');
                tmp.innerHTML = highlighted;
                const shikiPre = tmp.querySelector('pre');
                if (shikiPre) {
                  codeEl.innerHTML = shikiPre.querySelector('code')?.innerHTML || codeEl.innerHTML;
                }
              } catch {}
            }

            // Language label (matches editor .code-lang-label)
            pre.style.position = 'relative';
            const label = document.createElement('span');
            label.className = 'preview-code-lang-label';
            label.textContent = lang || 'text';
            pre.appendChild(label);

            // Copy button (matches editor .code-copy-btn)
            const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            const btn = document.createElement('button');
            btn.className = 'preview-code-copy-btn';
            btn.title = 'Copy code';
            btn.innerHTML = copyIcon;
            btn.onclick = () => {
              navigator.clipboard.writeText(code);
              btn.innerHTML = checkIcon;
              btn.style.color = '#86efac';
              setTimeout(() => { btn.innerHTML = copyIcon; btn.style.color = ''; }, 1500);
            };
            pre.appendChild(btn);
          });
        });
      }).catch((err) => console.error('Shiki load failed:', err));
    }

    // ── Inline TOC smooth scroll ──
    const tocLinks = root.querySelectorAll('.preview-toc-link');
    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href')?.slice(1);
        if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // ── Link preview on hover (use ref to avoid stale closures) ──
    const externalLinks = root.querySelectorAll('a[href^="http"]:not(.mention-chip):not(.preview-toc-link):not(.link-preview-card)');
    const linkHandlers = [];
    externalLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const onEnter = () => linkPreviewRef.current.show(link, href);
      const onLeave = () => linkPreviewRef.current.cancel();
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
      linkHandlers.push({ el: link, onEnter, onLeave });
    });

    // ── Mention hover cards ──
    const mentionChips = root.querySelectorAll('.mention-chip[data-username]');
    const mentionHandlers = [];
    mentionChips.forEach((chip) => {
      const onEnter = () => {
        clearTimeout(mentionTimerRef.current);
        mentionTimerRef.current = setTimeout(() => {
          const rect = chip.getBoundingClientRect();
          setMentionCard({
            username: chip.dataset.username,
            displayName: chip.dataset.displayname || chip.dataset.username,
            avatar: chip.dataset.avatar || '',
            top: rect.bottom + 6,
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
          });
        }, 300);
      };
      const onLeave = () => {
        clearTimeout(mentionTimerRef.current);
        mentionTimerRef.current = setTimeout(() => setMentionCard(null), 200);
      };
      chip.addEventListener('mouseenter', onEnter);
      chip.addEventListener('mouseleave', onLeave);
      mentionHandlers.push({ el: chip, onEnter, onLeave });
    });

    return () => {
      linkHandlers.forEach(({ el, onEnter, onLeave }) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      mentionHandlers.forEach(({ el, onEnter, onLeave }) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      clearTimeout(mentionTimerRef.current);
    };
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

      {/* Title */}
      {title && (
        <h1 className="text-[2.2em] font-extrabold leading-tight mt-6 mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>{title}</h1>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xl mb-3" style={{ color: 'var(--text-muted)', fontFamily: "'Source Serif 4', Georgia, serif" }}>{subtitle}</p>
      )}

      {/* Author bar — under title */}
      {user && (
        <div className="flex items-center gap-3 mt-1 mb-2">
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
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 bg-[#9b7bf70a] rounded-full text-[12px] text-[#9b7bf7]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Gap before content */}
      <div style={{ height: '32px' }} />

      <div>
        {renderedHTML ? (
          <div
            ref={contentRef}
            className="blog-preview-content max-w-none"
          />
        ) : (
          <p className="text-[var(--text-faint)] italic">Start writing to see a preview...</p>
        )}
      </div>

      {/* Link preview tooltip */}
      {linkPreview.preview && (
        <LinkPreviewTooltip
          anchorEl={linkPreview.preview.anchorEl}
          url={linkPreview.preview.url}
          onClose={linkPreview.hide}
        />
      )}

      {/* Mention hover card */}
      {mentionCard && (
        <div
          className="mention-hover-card"
          style={{ top: mentionCard.top, left: mentionCard.left }}
          onMouseEnter={() => clearTimeout(mentionTimerRef.current)}
          onMouseLeave={() => { mentionTimerRef.current = setTimeout(() => setMentionCard(null), 150); }}
        >
          <div className="mention-hover-card-header">
            {mentionCard.avatar ? (
              <img src={mentionCard.avatar} alt="" className="mention-hover-card-avatar" />
            ) : (
              <div className="mention-hover-card-initial">
                {(mentionCard.displayName || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="mention-hover-card-name">{mentionCard.displayName}</div>
              <div className="mention-hover-card-username">@{mentionCard.username}</div>
            </div>
          </div>
          <a href={`/@${mentionCard.username}`} className="mention-hover-card-link">
            View profile
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
          </a>
        </div>
      )}
    </div>
  );
}
