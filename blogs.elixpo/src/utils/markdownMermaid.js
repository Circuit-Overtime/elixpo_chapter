export function extractMermaidFences(markdown = '') {
  const diagrams = [];
  const content = String(markdown).replace(
    /```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)```/gi,
    (_, diagram) => {
      const placeholder = `MERMAIDPLACEHOLDER${diagrams.length}END`;
      diagrams.push(diagram.trim());
      return placeholder;
    },
  );
  return { content, diagrams };
}
