import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_BADGES, badgeProgress, longestConsecutiveWeeks } from '../lib/badgeDefinitions.js';

test('creator badge catalogue has 25 stable unique identifiers', () => {
  assert.equal(CREATOR_BADGES.length, 25);
  assert.equal(new Set(CREATOR_BADGES.map((badge) => badge.id)).size, 25);
  for (const badge of CREATOR_BADGES) {
    assert.match(badge.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(badge.artwork, `/badges/${badge.id}.svg`);
  }
});

test('manual badges are never automatically earned', () => {
  const staffPick = CREATOR_BADGES.find((badge) => badge.id === 'staff-pick');
  assert.deepEqual(badgeProgress(staffPick, {}), { value: 0, target: null, earned: false });
});

test('badge progress reaches a threshold exactly', () => {
  const firstLight = CREATOR_BADGES.find((badge) => badge.id === 'first-light');
  assert.equal(badgeProgress(firstLight, { publishedStories: 0 }).earned, false);
  assert.equal(badgeProgress(firstLight, { publishedStories: 1 }).earned, true);
});

test('weekly streaks ignore duplicates and stop at gaps', () => {
  assert.equal(longestConsecutiveWeeks([105, 106, 106, 107, 110, 111]), 3);
  assert.equal(longestConsecutiveWeeks([]), 0);
});
