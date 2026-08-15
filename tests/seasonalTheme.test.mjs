import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getActiveSeasonalTheme,
  isIndianIndependenceDay,
  isSeasonalThemeActive,
} from '../src/themes/seasonal/index.js';

test('enables Independence Day throughout 15 August in India', () => {
  assert.equal(isIndianIndependenceDay(new Date('2026-08-14T18:30:00.000Z')), true);
  assert.equal(isIndianIndependenceDay(new Date('2026-08-15T18:29:59.999Z')), true);
});

test('uses India time rather than the server or visitor time zone', () => {
  assert.equal(isIndianIndependenceDay(new Date('2026-08-14T18:29:59.999Z')), false);
  assert.equal(isIndianIndependenceDay(new Date('2026-08-15T18:30:00.000Z')), false);
});

test('returns the highest-priority active theme from the registry', () => {
  assert.equal(getActiveSeasonalTheme(new Date('2026-08-15T12:00:00.000Z'))?.id, 'india-independence-day');
  assert.equal(getActiveSeasonalTheme(new Date('2026-08-16T12:00:00.000Z')), null);
});

test('supports annual theme ranges that wrap across New Year', () => {
  const theme = {
    schedule: { type: 'annual', start: '12-30', end: '01-02', timeZone: 'UTC' },
  };
  assert.equal(isSeasonalThemeActive(theme, new Date('2026-12-31T12:00:00.000Z')), true);
  assert.equal(isSeasonalThemeActive(theme, new Date('2027-01-02T12:00:00.000Z')), true);
  assert.equal(isSeasonalThemeActive(theme, new Date('2027-01-03T12:00:00.000Z')), false);
});
