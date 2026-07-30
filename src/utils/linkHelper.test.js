import test from 'node:test';
import assert from 'node:assert';
import { normalizeUrl } from './linkHelper.js';

test('normalizeUrl preserves absolute HTTP/HTTPS URLs', () => {
  assert.strictEqual(normalizeUrl('https://example.com/path'), 'https://example.com/path');
  assert.strictEqual(normalizeUrl('http://example.com/path?q=1#fr'), 'http://example.com/path?q=1#fr');
});

test('normalizeUrl normalizes scheme-less URLs to https', () => {
  assert.strictEqual(normalizeUrl('example.com/path'), 'https://example.com/path');
  assert.strictEqual(normalizeUrl('www.google.com'), 'https://www.google.com');
  assert.strictEqual(normalizeUrl('sub.domain.org/path?q=1#abc'), 'https://sub.domain.org/path?q=1#abc');
  assert.strictEqual(normalizeUrl('localhost:3000'), 'https://localhost:3000');
});

test('normalizeUrl preserves internal paths and anchors', () => {
  assert.strictEqual(normalizeUrl('/some-internal-path'), '/some-internal-path');
  assert.strictEqual(normalizeUrl('#some-anchor'), '#some-anchor');
});

test('normalizeUrl preserves other protocols', () => {
  assert.strictEqual(normalizeUrl('mailto:user@example.com'), 'mailto:user@example.com');
  assert.strictEqual(normalizeUrl('tel:+1234567890'), 'tel:+1234567890');
  assert.strictEqual(normalizeUrl('javascript:void(0)'), 'javascript:void(0)');
  assert.strictEqual(normalizeUrl('ftp://files.example.com'), 'ftp://files.example.com');
});
