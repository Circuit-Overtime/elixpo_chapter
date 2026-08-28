export const docsNav = [
  {
    title: 'Using LixBlogs',
    items: [
      { title: 'Overview', slug: 'overview', description: 'Learn how publishing, profiles, organizations, and discovery work.' },
      { title: 'Write and publish', slug: 'writing-publishing', description: 'Create, preview, publish, update, and control the visibility of a story.' },
      { title: 'Collaboration', slug: 'collaboration', description: 'Invite co-authors and edit a story together safely.' },
      { title: 'Media and storage', slug: 'media-storage', description: 'Upload, track, replace, and delete covers and editor images.' },
      { title: 'Creator analytics', slug: 'creator-analytics', description: 'Read creator metrics, compare date ranges, and export reports.' },
      { title: 'LixBlogs CLI', slug: 'cli', description: 'Authenticate, write, publish, and automate through the supported command line.' },
    ],
  },
  {
    title: 'Connected Services',
    items: [
      { title: 'Integrations overview', slug: 'integrations', description: 'Connect services, understand permissions, and disconnect them safely.' },
      { title: 'Cloudinary storage', slug: 'cloudinary', description: 'Store new blog media in your own Cloudinary product environment.' },
      { title: 'LixRL short links', slug: 'lixrl', description: 'Create account-owned lixrl.com links from the editor.' },
    ],
  },
  {
    title: 'Find and manage content',
    items: [
      { title: 'Search qualifiers', slug: 'search-syntax', description: 'Use filters and GitHub-style qualifiers to find stories.' },
    ],
  },
  {
    title: 'LixEditor Developers',
    items: [
      { title: 'Editor overview', slug: 'editor-overview', description: 'Understand the block editor package that powers LixBlogs.' },
      { title: 'Installation', slug: 'installation', description: 'Install the package via npm.' },
      { title: 'Quick Start', slug: 'quick-start', description: 'Render your first editor.' },
      { title: '<LixEditor> Props', slug: 'props', description: 'All supported props.' },
      { title: 'Imperative API (ref)', slug: 'imperative-api', description: 'getBlocks, getEditor, replaceBlocks.' },
      { title: 'Block Model', slug: 'block-model', description: 'The shape of a block and built-in types.' },
      { title: 'Markdown & Slash Commands', slug: 'markdown-shortcuts', description: 'Shortcuts while typing.' },
      { title: 'Rendering Stored Content', slug: 'rendering', description: 'Read-only render of saved blocks.' },
    ],
  },
];

export const docsNavFlat = docsNav.flatMap((section) => section.items);

export function getDocsSiblings(slug) {
  const flat = docsNavFlat;
  const i = flat.findIndex((item) => item.slug === slug);
  return { prev: flat[i - 1] || null, next: flat[i + 1] || null };
}
