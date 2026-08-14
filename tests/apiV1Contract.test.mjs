import test from 'node:test';
import assert from 'node:assert/strict';
import { blogEntityTag } from '../lib/api/v1/entityTag.js';
import { countBlockWords, normalizeBlogInput, normalizeTags, slugify } from '../lib/api/v1/blogInput.js';
import { decodeCursor, encodeCursor, parsePage } from '../lib/api/v1/pagination.js';
import { checkIfMatch } from '../lib/api/v1/preconditions.js';
import {
  beginIdempotentOperation,
  completeIdempotentOperation,
  hashApiRequest,
  validateIdempotencyKey,
} from '../lib/api/v1/operations.js';

test('cursor pagination is opaque, stable, and capped at 100 rows', () => {
  const cursor = encodeCursor({ id: 'blog-1', updated_at: 1234 });
  assert.doesNotMatch(cursor, /blog-1/);
  assert.deepEqual(decodeCursor(cursor), { id: 'blog-1', updatedAt: 1234 });
  assert.deepEqual(parsePage(new URLSearchParams(`limit=500&cursor=${cursor}`)), {
    limit: 100,
    cursor: { id: 'blog-1', updatedAt: 1234 },
  });
  assert.throws(() => parsePage(new URLSearchParams('limit=0')), /invalid_limit/);
  assert.throws(() => decodeCursor('not-a-cursor'), /invalid_cursor/);
});

test('blog entity tags are stable and change with writable content', async () => {
  const blog = { id: 'blog-1', title: 'Title', content: 'one', updated_at: 1 };
  assert.equal(await blogEntityTag(blog), await blogEntityTag({ ...blog }));
  assert.notEqual(await blogEntityTag(blog), await blogEntityTag({ ...blog, content: 'two' }));
});

test('blog input is bounded and normalized for API writes', () => {
  assert.deepEqual(normalizeTags([' Tech ', 'tech', 'Web']), ['tech', 'web']);
  assert.equal(slugify(' A Better CLI! '), 'a-better-cli');
  assert.equal(countBlockWords([{ content: [{ type: 'text', text: 'one two three' }] }]), 3);
  assert.deepEqual(normalizeBlogInput({ title: ' Draft ', content: [], memberOnly: false }), {
    title: 'Draft',
    content: [],
    tags: undefined,
    memberOnly: false,
  });
  assert.throws(() => normalizeBlogInput({ content: 'markdown' }), /block array/);
  assert.throws(() => normalizeBlogInput({ content: [], coverUrl: 'http://example.com/image.png' }), /HTTPS/);
});

test('write preconditions require and compare strong entity tags', async () => {
  const blog = { id: 'blog-1', title: 'Title', content: 'one', updated_at: 1 };
  const etag = await blogEntityTag(blog);
  const missing = await checkIfMatch(new Request('https://blogs.elixpo.com/api/v1/blogs/blog-1'), blog);
  assert.equal(missing.status, 428);
  const stale = await checkIfMatch(new Request('https://blogs.elixpo.com/api/v1/blogs/blog-1', {
    headers: { 'if-match': '"stale"' },
  }), blog);
  assert.equal(stale.status, 412);
  const current = await checkIfMatch(new Request('https://blogs.elixpo.com/api/v1/blogs/blog-1', {
    headers: { 'if-match': etag },
  }), blog);
  assert.equal(current.ok, true);
});

function idempotencyDb() {
  const rows = new Map();
  const rowKey = (values) => values.slice(0, 3).join('|');
  return {
    rows,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              if (/DELETE FROM api_idempotency_keys/.test(sql)) {
                const key = rowKey(values);
                const row = rows.get(key);
                if (row && row.expires_at <= values[3]) rows.delete(key);
                return { meta: { changes: row ? 1 : 0 } };
              }
              if (/INSERT OR IGNORE/.test(sql)) {
                const key = rowKey(values);
                if (rows.has(key)) return { meta: { changes: 0 } };
                rows.set(key, {
                  request_hash: values[3],
                  status_code: null,
                  response_body: null,
                  expires_at: values[5],
                });
                return { meta: { changes: 1 } };
              }
              if (/UPDATE api_idempotency_keys/.test(sql)) {
                const key = values.slice(2, 5).join('|');
                const row = rows.get(key);
                if (!row || row.request_hash !== values[5]) return { meta: { changes: 0 } };
                row.status_code = values[0];
                row.response_body = values[1];
                return { meta: { changes: 1 } };
              }
              throw new Error(`unexpected run: ${sql}`);
            },
            async first() {
              if (/SELECT request_hash/.test(sql)) return rows.get(rowKey(values)) || null;
              throw new Error(`unexpected first: ${sql}`);
            },
          };
        },
      };
    },
  };
}

test('idempotency reserves, rejects concurrent reuse, and replays a completed result', async () => {
  const db = idempotencyDb();
  const requestHash = await hashApiRequest({ title: 'First' });
  const input = { userId: 'user-1', operation: 'blogs.create', key: 'request-123', requestHash };

  assert.deepEqual(await beginIdempotentOperation(db, input), { state: 'started' });
  await assert.rejects(beginIdempotentOperation(db, input), (error) => error.code === 'idempotency_in_progress');
  await completeIdempotentOperation(db, { ...input, status: 201, body: { data: { id: 'blog-1' } } });
  assert.deepEqual(await beginIdempotentOperation(db, input), {
    state: 'replay',
    status: 201,
    body: { data: { id: 'blog-1' } },
  });
});

test('idempotency rejects a key reused for different input', async () => {
  const db = idempotencyDb();
  const input = {
    userId: 'user-1',
    operation: 'blogs.create',
    key: 'request-456',
    requestHash: await hashApiRequest({ title: 'First' }),
  };
  await beginIdempotentOperation(db, input);
  await assert.rejects(
    beginIdempotentOperation(db, { ...input, requestHash: await hashApiRequest({ title: 'Second' }) }),
    (error) => error.code === 'idempotency_key_reused',
  );
  assert.throws(() => validateIdempotencyKey('short'), /between 8 and 128/);
});
