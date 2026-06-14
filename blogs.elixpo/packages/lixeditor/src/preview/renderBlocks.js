/**
 * Converts BlockNote document blocks to HTML string.
 * Used by LixPreview for server-side or static rendering.
 */
export function renderBlocksToHTML(blocks) {
  if (!blocks || !blocks.length) return '';

  function inlineToHTML(content) {
    if (!content || !Array.isArray(content)) return '';
    return content.map((c) => {
      if (c.type === 'inlineEquation' && c.props?.latex) {
        return `<span class="lix-inline-equation" data-latex="${encodeURIComponent(c.props.latex)}"></span>`;
      }
      if (c.type === 'dateInline' && c.props?.date) {
        let formatted;
        try { formatted = new Date(c.props.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { formatted = c.props.date; }
        return `<span class="lix-date-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${formatted}</span>`;
      }
      // Links wrap child content
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

  // Collect headings for TOC
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
      if (block.children?.length) collectHeadings(block.children);
    }
  }
  collectHeadings(blocks);

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
        return `<li class="lix-bullet">${content}${childrenHTML}</li>`;
      case 'numberedListItem':
        return `<li class="lix-numbered">${content}${childrenHTML}</li>`;
      case 'checkListItem': {
        const checked = !!block.props?.checked;
        const cb = `<span class="lix-checkbox${checked ? ' lix-checkbox--checked' : ''}"><span class="lix-checkbox-icon">${checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span></span>`;
        return `<li class="lix-check${checked ? ' lix-check--checked' : ''}">${cb}<span class="lix-check-text">${content}</span>${childrenHTML}</li>`;
      }
      case 'blockEquation':
        if (block.props?.latex) return `<div class="lix-block-equation" data-latex="${encodeURIComponent(block.props.latex)}"></div>${childrenHTML}`;
        return childrenHTML;
      case 'mermaidBlock':
        if (block.props?.diagram) return `<div class="lix-mermaid-block" data-diagram="${encodeURIComponent(block.props.diagram)}"></div>${childrenHTML}`;
        return childrenHTML;
      case 'divider':
        return `<hr class="lix-divider" />${childrenHTML}`;
      case 'codeBlock': {
        const lang = block.props?.language || '';
        const code = (block.content || []).map(c => c.text || '').join('');
        return `<pre><code class="language-${lang}">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>${childrenHTML}`;
      }
      case 'image':
        if (block.props?.url) {
          return `<figure><img src="${block.props.url}" alt="${block.props?.caption || ''}" />${block.props?.caption ? `<figcaption>${block.props.caption}</figcaption>` : ''}</figure>${childrenHTML}`;
        }
        return childrenHTML;
      case 'table': {
        const rows = block.content?.rows || [];
        if (!rows.length) return childrenHTML;
        const headerRows = block.content?.headerRows || 0;
        let table = '<table>';
        rows.forEach((row, ri) => {
          table += '<tr>';
          (row.cells || []).forEach(cell => {
            const tag = ri < headerRows ? 'th' : 'td';
            let cellContent;
            if (Array.isArray(cell)) cellContent = cell;
            else if (cell?.content) cellContent = Array.isArray(cell.content) ? cell.content : [];
            else cellContent = [];
            table += `<${tag}>${inlineToHTML(cellContent)}</${tag}>`;
          });
          table += '</tr>';
        });
        table += '</table>';
        return table + childrenHTML;
      }
      case 'paragraph':
      default:
        if (content) return `<p>${content}</p>${childrenHTML}`;
        return childrenHTML || '';
    }
  }

  function renderListGroup(blockList) {
    if (!blockList?.length) return '';
    const out = [];
    let i = 0;
    while (i < blockList.length) {
      const block = blockList[i];
      if (block.type === 'bulletListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'bulletListItem') { items += renderBlock(blockList[i]); i++; }
        out.push(`<ul>${items}</ul>`);
      } else if (block.type === 'numberedListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'numberedListItem') { items += renderBlock(blockList[i]); i++; }
        out.push(`<ol>${items}</ol>`);
      } else if (block.type === 'checkListItem') {
        let items = '';
        while (i < blockList.length && blockList[i].type === 'checkListItem') { items += renderBlock(blockList[i]); i++; }
        out.push(`<ul class="lix-checklist">${items}</ul>`);
      } else {
        out.push(renderBlock(block));
        i++;
      }
    }
    return out.join('\n');
  }

  let html = renderListGroup(blocks);

  // Build inline TOC
  if (headings.length > 0) {
    const tocItems = headings.map(h => {
      const indent = (h.level - 1) * 16;
      return `<li><a href="#${h.id}" class="lix-toc-link" style="padding-left:${indent}px">${h.text}</a></li>`;
    }).join('');
    const tocHTML = `<div class="lix-toc-block"><p class="lix-toc-label">Table of Contents</p><ul class="lix-toc-list">${tocItems}</ul></div>`;
    html = html.replace('__TOC_PLACEHOLDER__', tocHTML);
  } else {
    html = html.replace('__TOC_PLACEHOLDER__', '');
  }

  return html;
}
