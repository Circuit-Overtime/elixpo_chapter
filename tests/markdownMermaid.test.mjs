import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMermaidFences,
  extractMermaidPaste,
} from '../src/utils/markdownMermaid.js';

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

test('Mermaid extraction preserves meaningful indentation on boundary lines', () => {
  const result = extractMermaidFences('```mermaid\n    flowchart TD\n      A --> B\n```');

  assert.equal(result.diagrams[0], '    flowchart TD\n      A --> B');
});

test('rich Mermaid code-block clipboard data becomes a Mermaid placeholder', () => {
  const result = extractMermaidPaste(
    'flowchart TD\n    A --> B',
    '<pre><code class="language-mermaid">flowchart TD</code></pre>',
  );

  assert.equal(result.content, 'MERMAIDPLACEHOLDER0END');
  assert.deepEqual(result.diagrams, ['flowchart TD\n    A --> B']);
});
