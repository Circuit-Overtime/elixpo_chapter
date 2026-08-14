function text(value) {
  return [{ type: 'text', text: value }];
}

export function markdownToBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', content: text(paragraph.join(' ').trim()) });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    const fence = trimmed.match(/^```([\w+-]*)/);
    if (fence) {
      flush();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      blocks.push(fence[1].toLowerCase() === 'mermaid'
        ? { type: 'mermaidBlock', props: { diagram: code.join('\n') } }
        : { type: 'codeBlock', props: { language: fence[1].toLowerCase() }, content: text(code.join('\n')) });
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', props: { level: String(heading[1].length) }, content: text(heading[2]) });
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    if (bullet) { flush(); blocks.push({ type: 'bulletListItem', content: text(bullet[1]) }); continue; }
    const numbered = trimmed.match(/^\d+\.\s+(.+)/);
    if (numbered) { flush(); blocks.push({ type: 'numberedListItem', content: text(numbered[1]) }); continue; }
    const quote = trimmed.match(/^>\s?(.*)/);
    if (quote) { flush(); blocks.push({ type: 'quote', content: text(quote[1]) }); continue; }
    const image = trimmed.match(/^!\[([^\]]*)\]\((https:\/\/[^)]+)\)$/);
    if (image) { flush(); blocks.push({ type: 'image', props: { url: image[2], caption: image[1] } }); continue; }
    if (/^([-*_])\1{2,}$/.test(trimmed)) { flush(); blocks.push({ type: 'divider' }); continue; }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

function blockText(block) {
  return (block?.content || []).map((item) => typeof item === 'string' ? item : item?.text || '').join('');
}

export function blocksToMarkdown(blocks) {
  return (blocks || []).map((block) => {
    const value = blockText(block);
    if (block.type === 'heading') return `${'#'.repeat(Number(block.props?.level) || 1)} ${value}`;
    if (block.type === 'bulletListItem') return `- ${value}`;
    if (block.type === 'numberedListItem') return `1. ${value}`;
    if (block.type === 'quote') return `> ${value}`;
    if (block.type === 'codeBlock') return `\`\`\`${block.props?.language || ''}\n${value}\n\`\`\``;
    if (block.type === 'mermaidBlock') return `\`\`\`mermaid\n${block.props?.diagram || ''}\n\`\`\``;
    if (block.type === 'image') return `![${block.props?.caption || ''}](${block.props?.url || ''})`;
    if (block.type === 'divider') return '---';
    return value;
  }).join('\n\n');
}
