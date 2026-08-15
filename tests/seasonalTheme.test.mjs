import assert from 'node:assert/strict';
import test from 'node:test';

import { isIndianIndependenceDay } from '../src/utils/seasonalTheme.js';

test('enables Independence Day throughout 15 August in India', () => {
  assert.equal(isIndianIndependenceDay(new Date('2026-08-14T18:30:00.000Z')), true);
  assert.equal(isIndianIndependenceDay(new Date('2026-08-15T18:29:59.999Z')), true);
});

test('uses India time rather than the server or visitor time zone', () => {
  assert.equal(isIndianIndependenceDay(new Date('2026-08-14T18:29:59.999Z')), false);
  assert.equal(isIndianIndependenceDay(new Date('2026-08-15T18:30:00.000Z')), false);
});
