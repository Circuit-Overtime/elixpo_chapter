export const SITE_TIPS = [
  'Press Ctrl or Cmd + S in the editor to save immediately.',
  'Add up to five focused topics so the right readers can discover your story.',
  'Use a punchline to make your story easier to understand in the feed and search.',
  'Invite co-authors from Publish settings when a story needs a second pair of eyes.',
  'Your reading list keeps useful stories ready for later.',
  'A descriptive cover and title make shared links easier to recognize.',
  'Preview your post before publishing to catch layout surprises.',
];

export const LOADING_MESSAGES = [
  { text: 'Press Ctrl or Cmd + S in the editor to save immediately.' },
  { text: 'Add focused topics so the right readers can discover your story.' },
  { text: 'Found something that does not look right?', action: 'Report an issue', href: 'https://github.com/elixpo/blogs.elixpo/issues/new?labels=bug&title=%5BBUG%5D%3A+' },
  { text: 'A descriptive cover and title make shared links easier to recognize.' },
  { text: 'Have an idea that would improve writing on LixBlogs?', action: 'Suggest a feature', href: 'https://github.com/elixpo/blogs.elixpo/issues/new?labels=enhancement&title=%5BFEATURE%5D%3A+' },
  { text: 'Preview your post before publishing to catch layout surprises.' },
  { text: 'LixBlogs is built in public and shaped by its community.', action: 'Star the project', href: 'https://github.com/elixpo/blogs.elixpo' },
  { text: 'Invite co-authors from Publish settings when a story needs a second pair of eyes.' },
];

export const ONBOARDING_TIP_DAYS = 14;

export function tipForDay(seed = '') {
  const day = Math.floor(Date.now() / 86_400_000);
  const seedValue = String(seed).split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return { day, tip: SITE_TIPS[(day + seedValue) % SITE_TIPS.length] };
}
