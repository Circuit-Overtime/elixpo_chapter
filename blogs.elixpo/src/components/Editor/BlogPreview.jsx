'use client';

import { useEffect, useRef } from 'react';

function renderBlocksToHTML(blocks) {
  if (!blocks || !blocks.length) return '';
  const parts = [];

  function inlineToHTML(content) {
    if (!content || !Array.isArray(content)) return '';
    return content.map((c) => {
      if (c.type === 'inlineEquation' && c.props?.latex) {
        return `<span class="preview-inline-equation" data-latex="${encodeURIComponent(c.props.latex)}"></span>`;
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
      // Inline text color
      if (s.textColor) text = `<span style="color:${s.textColor}">${text}</span>`;
      if (s.backgroundColor) text = `<span style="background:${s.backgroundColor};border-radius:3px;padding:0 2px">${text}</span>`;
      return text;
    }).join('');
  }

  for (const block of blocks) {
    const content = inlineToHTML(block.content);
    switch (block.type) {
      case 'heading': {
        const level = block.props?.level || 1;
        parts.push(`<h${level}>${content}</h${level}>`);
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

  // Wrap consecutive bullet/numbered items in lists
  let html = parts.join('\n');
  html = html.replace(/((?:<li class="preview-bullet">.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<li class="preview-numbered">.*?<\/li>\n?)+)/g, '<ol>$1</ol>');
  return html;
}

export default function BlogPreview({ title, subtitle, coverPreview, coverZoom, coverPos, pageEmoji, tags, html, blocks, user, wordCount }) {
  const contentRef = useRef(null);

  // Determine which HTML to use — prefer blocks-based rendering
  const renderedHTML = blocks && blocks.length > 0 ? renderBlocksToHTML(blocks) : html;

  // Render KaTeX equations and mermaid diagrams after mount
  useEffect(() => {
    if (!contentRef.current) return;
    let cancelled = false;

    // Render block equations
    const eqEls = contentRef.current.querySelectorAll('.preview-block-equation[data-latex]');
    if (eqEls.length) {
      import('katex').then(({ default: katex }) => {
        if (cancelled) return;
        eqEls.forEach((el) => {
          try {
            const latex = decodeURIComponent(el.dataset.latex);
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
            const latex = decodeURIComponent(el.dataset.latex);
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
          theme: 'dark',
          themeVariables: {
            primaryColor: '#232d3f',
            primaryTextColor: '#e4e4e7',
            primaryBorderColor: '#c4b5fd',
            lineColor: '#8b8fa3',
            secondaryColor: '#1e1e2e',
            tertiaryColor: '#141a26',
            fontFamily: "'lixFont', sans-serif",
            fontSize: '16px',
          },
          flowchart: { useMaxWidth: false, padding: 20, nodeSpacing: 50, rankSpacing: 60 },
        });
        mermaidEls.forEach(async (el) => {
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
        });
      });
    }

    return () => { cancelled = true; };
  }, [renderedHTML]);

  return (
    <div className="blog-preview">
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
            <div className="w-[72px] h-[72px] rounded-full bg-[#0e121b] border-[3px] border-[#0e121b] shadow-lg flex items-center justify-center relative">
              <span className="text-[42px] leading-none select-none">{pageEmoji}</span>
              <div className="absolute inset-[-2px] rounded-full border border-[#232d3f]" />
            </div>
          </div>
        )}
      </div>

      {/* Spacer when emoji overlaps cover */}
      {pageEmoji && coverPreview && <div className="h-8" />}

      {title && (
        <h1 className="text-[2em] font-extrabold leading-tight mb-1">{title}</h1>
      )}

      {subtitle && (
        <p className="text-xl text-[#888] mb-4">{subtitle}</p>
      )}

      {/* Author bar */}
      {user && (
        <div className="flex items-center gap-3 mt-3 mb-4">
          <div className="flex -space-x-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-[#0e121b]" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#232d3f] border-2 border-[#0e121b] flex items-center justify-center text-[11px] font-bold text-[#9ca3af]">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#6b7a8d]">
            <span className="text-[#9ca3af] font-medium">{user.display_name || user.username || 'Author'}</span>
            <span className="text-[#3a3f4f]">·</span>
            <span>{Math.max(1, Math.ceil((wordCount || 0) / 200))} min read</span>
            <span className="text-[#3a3f4f]">·</span>
            <span>{wordCount || 0} {(wordCount || 0) === 1 ? 'word' : 'words'}</span>
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[#1D202A] rounded-full text-sm text-[#7ba8f0]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        {renderedHTML ? (
          <div
            ref={contentRef}
            className="blog-preview-content max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        ) : (
          <p className="text-[#555] italic">Start writing to see a preview...</p>
        )}
      </div>
    </div>
  );
}
