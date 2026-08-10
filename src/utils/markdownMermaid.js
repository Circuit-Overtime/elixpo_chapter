function trimSurroundingBlankLines(value) {
  return String(value)
    .replace(/^(?:[ \t]*\r?\n)+/, '')
    .replace(/(?:\r?\n[ \t]*)+$/, '');
}

export function extractMermaidFences(markdown = '') {
  const diagrams = [];
  const content = String(markdown).replace(
    /```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)```/gi,
    (_, diagram) => {
      const placeholder = `MERMAIDPLACEHOLDER${diagrams.length}END`;
      // Remove only empty wrapper lines. String#trim() also removes indentation
      // from the first and last source lines, which changes Mermaid syntax.
      diagrams.push(trimSurroundingBlankLines(diagram));
      return placeholder;
    },
  );
  return { content, diagrams };
}

export function extractMermaidPaste(text = '', html = '') {
  const fenced = extractMermaidFences(text);
  if (fenced.diagrams.length > 0) return fenced;

  // Rich clipboard formats (GitHub, documentation sites, IDEs) often expose a
  // Mermaid language marker only in HTML and put the raw diagram in text/plain.
  // Treat that single code block as Mermaid instead of letting BlockNote create
  // a generic code block.
  if (
    String(text).trim() &&
    /(?:language|lang)[-_]mermaid|data-language\s*=\s*["']mermaid["']/i.test(String(html))
  ) {
    return {
      content: 'MERMAIDPLACEHOLDER0END',
      diagrams: [trimSurroundingBlankLines(text)],
    };
  }

  return fenced;
}
