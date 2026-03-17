/**
 * Generate a random display name like "loony-bear" or "swift-falcon"
 * Used as default for email/password signups who skip naming.
 */

const adjectives = [
  'swift', 'brave', 'calm', 'clever', 'cool', 'cosmic', 'crisp', 'daring',
  'dizzy', 'eager', 'fancy', 'fierce', 'funky', 'gentle', 'giddy', 'groovy',
  'happy', 'hazy', 'icy', 'jazzy', 'jolly', 'keen', 'lazy', 'lively',
  'loony', 'lucky', 'mellow', 'mighty', 'misty', 'noble', 'nutty', 'odd',
  'peppy', 'plucky', 'quirky', 'rapid', 'rusty', 'salty', 'shy', 'silly',
  'sleek', 'snappy', 'snowy', 'solar', 'spicy', 'steady', 'stormy', 'sunny',
  'tiny', 'vivid', 'wacky', 'warm', 'wild', 'witty', 'zany', 'zen',
  'bold', 'cozy', 'dusty', 'epic', 'frosty', 'golden', 'hushed', 'lunar',
];

const nouns = [
  'bear', 'wolf', 'fox', 'owl', 'hawk', 'lynx', 'puma', 'deer',
  'crow', 'dove', 'orca', 'seal', 'hare', 'wren', 'moth', 'newt',
  'crab', 'swan', 'lark', 'viper', 'raven', 'robin', 'finch', 'otter',
  'moose', 'bison', 'crane', 'eagle', 'falcon', 'parrot', 'panda', 'koala',
  'tiger', 'cobra', 'gecko', 'lemur', 'manta', 'okapi', 'quail', 'stoat',
  'tapir', 'whale', 'yak', 'zebu', 'badger', 'ferret', 'bobcat', 'coyote',
  'dragon', 'phoenix', 'sphinx', 'kraken', 'pegasus', 'griffin', 'hydra', 'titan',
  'pixel', 'comet', 'spark', 'prism', 'orbit', 'pulse', 'nova', 'byte',
];

export function generateRandomDisplayName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}`;
}
