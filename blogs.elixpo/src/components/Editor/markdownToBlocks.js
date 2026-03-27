// Parse inline markdown (bold, italic, code, inline LaTeX) into BlockNote styled content

export function parseInlineContent(text) {
  const content = [];
  // Match: \(...\) inline LaTeX, ***bold italic***, **bold**, *italic*, `code`
  const regex = /(\\\((.+?)\\\)|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\$([^$]+?)\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      content.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      // \(...\) inline LaTeX
      content.push({ type: 'inlineEquation', props: { latex: match[2].trim() } });
    } else if (match[3]) {
      content.push({ type: 'text', text: match[3], styles: { bold: true, italic: true } });
    } else if (match[4]) {
      content.push({ type: 'text', text: match[4], styles: { bold: true } });
    } else if (match[5]) {
      content.push({ type: 'text', text: match[5], styles: { italic: true } });
    } else if (match[6]) {
      content.push({ type: 'text', text: match[6], styles: { code: true } });
    } else if (match[7]) {
      // $...$ inline math
      content.push({ type: 'inlineEquation', props: { latex: match[7].trim() } });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    content.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return content.length > 0 ? content : [{ type: 'text', text }];
}

// Parse markdown text into BlockNote block array

export function parseMarkdownToBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Code fence: ```lang ... ```
    const fenceMatch = trimmed.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const codeText = codeLines.join('\n');
      // Use codeBlock type — BlockNote's defaultBlockSpecs includes it
      blocks.push({
        type: 'codeBlock',
        props: { language: lang },
        content: [{ type: 'text', text: codeText }],
      });
      continue;
    }

    // Block LaTeX: \[...\] (may span multiple lines)
    if (trimmed === '\\[') {
      const latexLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '\\]') {
        latexLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip \]
      const latex = latexLines.join('\n').trim();
      if (latex) {
        blocks.push({ type: 'blockEquation', props: { latex } });
      }
      continue;
    }

    // Block LaTeX: $$...$$ (may span multiple lines)
    if (trimmed.startsWith('$$') && !trimmed.endsWith('$$')) {
      // Multi-line $$
      const latexLines = [trimmed.slice(2)];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        latexLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        latexLines.push(lines[i].trim().slice(0, -2));
        i++;
      }
      const latex = latexLines.join('\n').trim();
      if (latex) {
        blocks.push({ type: 'blockEquation', props: { latex } });
      }
      continue;
    }

    // Single-line block LaTeX: $$...$$ on one line
    const singleBlockMath = trimmed.match(/^\$\$(.+)\$\$$/);
    if (singleBlockMath) {
      blocks.push({ type: 'blockEquation', props: { latex: singleBlockMath[1].trim() } });
      i++; continue;
    }

    // Single-line \[...\] on one line
    const singleBracketMath = trimmed.match(/^\\\[(.+)\\\]$/);
    if (singleBracketMath) {
      blocks.push({ type: 'blockEquation', props: { latex: singleBracketMath[1].trim() } });
      i++; continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', props: { level: headingMatch[1].length.toString() }, content: parseInlineContent(headingMatch[2]) });
      i++; continue;
    }

    // Bullet list
    if (trimmed.match(/^[-*]\s+/)) {
      blocks.push({ type: 'bulletListItem', content: parseInlineContent(trimmed.replace(/^[-*]\s+/, '')) });
      i++; continue;
    }

    // Numbered list
    if (trimmed.match(/^\d+\.\s+/)) {
      blocks.push({ type: 'numberedListItem', content: parseInlineContent(trimmed.replace(/^\d+\.\s+/, '')) });
      i++; continue;
    }

    // Default paragraph with inline formatting (including inline LaTeX)
    blocks.push({ type: 'paragraph', content: parseInlineContent(trimmed) });
    i++;
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}
