// Extract a short plain-text excerpt ("starting lines") from BlockNote blocks.
export function excerptFromBlocks(blocks, max = 200) {
  if (!Array.isArray(blocks)) return '';
  const out = [];
  const walk = (list) => {
    for (const b of list || []) {
      if (out.join(' ').length >= max) return;
      // Skip non-prose blocks.
      if (b?.type && ['image', 'video', 'audio', 'file', 'codeBlock', 'table', 'equation'].includes(b.type)) continue;
      const txt = (b?.content || [])
        .map((c) => (typeof c === 'string' ? c : c?.text || ''))
        .join('')
        .trim();
      if (txt) out.push(txt);
      if (b?.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  const text = out.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}
