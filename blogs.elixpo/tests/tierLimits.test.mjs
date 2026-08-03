import test from 'node:test';
import assert from 'node:assert/strict';
import { getLimits } from '../lib/tiers.js';
import { mediaInventoryCacheKey } from '../lib/cache.js';

test('free managed storage is capped at 10 MB without changing Member storage', () => {
  assert.equal(getLimits('free').totalStorageBytes, 10 * 1024 * 1024);
  assert.equal(getLimits('member').totalStorageBytes, 2 * 1024 * 1024 * 1024);
});

test('media inventory caches are private to a versioned user key', () => {
  assert.equal(mediaInventoryCacheKey('user-123'), 'v3:media-inventory:user-123');
});
