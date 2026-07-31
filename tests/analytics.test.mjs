import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDevice, classifyReferrer, parseAnalyticsRange, percentChange } from '../lib/analytics.js';

test('parses preset analytics ranges and previous period', () => {
  const now = 2_000_000;
  const range = parseAnalyticsRange(new URLSearchParams('range=7d'), now);
  assert.equal(range.to - range.from, 7 * 86400);
  assert.equal(range.previousTo, range.from);
  assert.equal(range.previousTo - range.previousFrom, 7 * 86400);
});

test('rejects invalid and oversized custom ranges', () => {
  assert.throws(() => parseAnalyticsRange(new URLSearchParams('range=custom&from=bad&to=bad')));
  assert.throws(() => parseAnalyticsRange(new URLSearchParams('range=custom&from=2024-01-01&to=2026-01-01'), Date.parse('2026-02-01') / 1000));
});

test('classifies acquisition without retaining full referrer URLs', () => {
  assert.deepEqual(classifyReferrer(''), { source: 'Direct', domain: null });
  assert.deepEqual(classifyReferrer('https://blogs.elixpo.com/feed'), { source: 'Internal', domain: 'blogs.elixpo.com' });
  assert.deepEqual(classifyReferrer('https://www.google.com/search?q=post'), { source: 'Search', domain: 'google.com' });
  assert.deepEqual(classifyReferrer('https://www.reddit.com/r/writing'), { source: 'Social', domain: 'reddit.com' });
});

test('classifies devices and computes stable percentage changes', () => {
  assert.equal(classifyDevice('Mozilla/5.0 (iPhone; Mobile)'), 'Mobile');
  assert.equal(classifyDevice('Mozilla/5.0 (iPad; Tablet)'), 'Tablet');
  assert.equal(classifyDevice('Mozilla/5.0 (X11; Linux x86_64)'), 'Desktop');
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(5, 0), 100);
});
