import test from 'node:test';
import assert from 'node:assert/strict';

import { clearInheritedBlockTextColors } from '../src/utils/blockColorNormalization.js';

test('clears leaked neutral gray immediately after code and Mermaid blocks', () => {
  const blocks = clearInheritedBlockTextColors([
    { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'After code', styles: { textColor: '#9ca3af', bold: true } }] },
    { type: 'mermaidBlock', props: { diagram: 'flowchart LR' } },
    { type: 'paragraph', content: [{ type: 'text', text: 'After diagram', styles: { textColor: 'rgb(156, 163, 175)' } }] },
  ]);

  assert.deepEqual(blocks[1].content[0].styles, { bold: true });
  assert.deepEqual(blocks[3].content[0].styles, {});
});

test('preserves deliberately gray text away from a special-block boundary', () => {
  const blocks = clearInheritedBlockTextColors([
    { type: 'paragraph', content: [{ type: 'text', text: 'Normal' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Intentional gray', styles: { textColor: '#9ca3af' } }] },
  ]);

  assert.equal(blocks[1].content[0].styles.textColor, '#9ca3af');
});

