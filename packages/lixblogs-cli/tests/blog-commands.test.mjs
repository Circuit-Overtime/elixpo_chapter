import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BlogApiError } from '../src/api/BlogClient.js';
import { blogCreate, blogDelete, blogEdit, blogPublish } from '../src/commands/blog/index.js';
import { blocksToMarkdown, markdownToBlocks } from '../src/content/markdown.js';
import { validateBlogInput } from '../src/content/validate.js';

test('Markdown conversion retains supported structural blocks', () => {
  const markdown = '# Title\n\n- One\n\n```mermaid\ngraph TD\n A-->B\n```';
  const blocks = markdownToBlocks(markdown);
  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'bulletListItem', 'mermaidBlock']);
  assert.match(blocksToMarkdown(blocks), /```mermaid/);
});

test('Markdown conversion retains inline emphasis, code, and HTTPS links', () => {
  const markdown = 'Use **bold**, *italic*, `code`, and [the docs](https://blogs.elixpo.com/docs).';
  const blocks = markdownToBlocks(markdown);

  assert.deepEqual(blocks[0].content, [
    { type: 'text', text: 'Use ' },
    { type: 'text', text: 'bold', styles: { bold: true } },
    { type: 'text', text: ', ' },
    { type: 'text', text: 'italic', styles: { italic: true } },
    { type: 'text', text: ', ' },
    { type: 'text', text: 'code', styles: { code: true } },
    { type: 'text', text: ', and ' },
    {
      type: 'link',
      href: 'https://blogs.elixpo.com/docs',
      content: [{ type: 'text', text: 'the docs', styles: {} }],
    },
    { type: 'text', text: '.' },
  ]);
  assert.equal(blocksToMarkdown(blocks), markdown);
});

test('Markdown conversion preserves checked and unchecked task lists', () => {
  const markdown = '- [ ] Draft the post\n\n- [x] Publish the post';
  const blocks = markdownToBlocks(markdown);

  assert.deepEqual(blocks.map((block) => block.type), ['checkListItem', 'checkListItem']);
  assert.deepEqual(blocks.map((block) => block.props.checked), [false, true]);
  assert.equal(blocksToMarkdown(blocks), markdown);
});

test('create dry-run validates input without calling the API', async () => {
  let called = false;
  const result = await blogCreate({
    client: { create: async () => { called = true; } },
    options: { title: 'Post', content: 'Body text', 'dry-run': true },
  });
  assert.equal(called, false);
  assert.equal(result.input.title, 'Post');
  assert.equal(result.input.content[0].type, 'paragraph');
});

test('local validation rejects oversized metadata and short publishing content', () => {
  assert.throws(() => validateBlogInput({ title: 'x'.repeat(301), content: [] }), /300/);
  assert.throws(() => validateBlogInput({ title: 'Post', content: markdownToBlocks('too short') }, { publishing: true }), /20 words/);
  assert.doesNotThrow(() => validateBlogInput({
    title: 'Post',
    content: markdownToBlocks('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'),
  }, { publishing: true }));
});

test('delete fails closed without explicit confirmation', async () => {
  await assert.rejects(
    blogDelete({ client: {}, id: 'blog-1', options: { yes: false } }),
    /requires --yes/,
  );
});

test('publish validates before requiring explicit confirmation', async () => {
  const blog = {
    title: 'Ready', etag: '"one"', status: 'draft',
    content: markdownToBlocks('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'),
  };
  await assert.rejects(
    blogPublish({ client: { get: async () => blog }, id: 'blog-1', options: {} }),
    /requires --yes/,
  );
  const result = await blogPublish({
    client: { get: async () => blog, publish: async () => ({ id: 'blog-1', status: 'published' }) },
    id: 'blog-1',
    options: { yes: true },
  });
  assert.equal(result.status, 'published');
});

test('edit conflict preserves local and server versions on disk', async () => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'lixblogs-conflict-test-'));
  let gets = 0;
  const client = {
    async get() {
      gets += 1;
      return {
        id: 'blog-1', etag: gets === 1 ? '"old"' : '"new"',
        content: markdownToBlocks(gets === 1 ? 'Old' : 'Server version'),
      };
    },
    async update() {
      throw new BlogApiError('revision_conflict', 'Changed', { status: 412 });
    },
  };
  try {
    let conflict;
    try {
      await blogEdit({
        client,
        id: 'blog-1',
        options: { content: 'Local version', conflictDirectory: directory },
      });
    } catch (error) {
      conflict = error;
    }
    assert.equal(conflict.code, 'revision_conflict');
    assert.equal(await fs.readFile(conflict.details.serverPath, 'utf8'), 'Server version');
    assert.match(await fs.readFile(conflict.details.localPath, 'utf8'), /Local version/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
