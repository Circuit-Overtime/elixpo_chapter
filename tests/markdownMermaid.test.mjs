import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMermaidFences } from '../src/utils/markdownMermaid.js';

test('Mermaid fences are extracted across casing, spacing, and CRLF newlines', () => {
  const markdown = [
    'Before',
    '``` Mermaid  \r\nflowchart TD\r\n  A --> B\r\n```',
    'Between',
    '```mermaid\nsequenceDiagram\n  A->>B: Hello\n```',
  ].join('\n');
  const result = extractMermaidFences(markdown);

  assert.deepEqual(result.diagrams, [
    'flowchart TD\r\n  A --> B',
    'sequenceDiagram\n  A->>B: Hello',
  ]);
  assert.match(result.content, /MERMAIDPLACEHOLDER0END/);
  assert.match(result.content, /MERMAIDPLACEHOLDER1END/);
  assert.doesNotMatch(result.content, /```/);
});
