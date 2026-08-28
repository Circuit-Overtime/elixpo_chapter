import test from 'node:test';
import assert from 'node:assert/strict';
import { skillInspect, skillInstall, skillList } from '../src/commands/skill/index.js';

test('bundled skills are individually discoverable', async () => {
  const skills = await skillList();
  assert.deepEqual(skills.map((skill) => skill.name), [
    'lixblogs-analytics',
    'lixblogs-author',
    'lixblogs-editorial',
    'lixblogs-organizations',
    'lixblogs-publish',
  ]);
  assert.ok(skills.every((skill) => skill.minimumCliVersion === '1.2.0'));
});

test('skill inspection returns the exact agent instruction', async () => {
  const skill = await skillInspect({ name: 'lixblogs-author' });
  assert.match(skill.content, /^---\nname: lixblogs-author/m);
  assert.match(skill.content, /--json --no-input/);
});

test('skill installation supports a non-writing dry run', async () => {
  const result = await skillInstall({
    name: 'lixblogs-publish',
    options: { target: '.test-agent-skills', 'dry-run': true },
  });
  assert.equal(result.dryRun, true);
  assert.match(result.target, /\.test-agent-skills\/lixblogs-publish$/);
});
