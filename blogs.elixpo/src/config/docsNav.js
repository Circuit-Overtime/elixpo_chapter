export const docsNav = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Overview', slug: 'overview', description: 'What LixEditor is and how it fits LixBlogs.' },
      { title: 'Installation', slug: 'installation', description: 'Install the package via npm.' },
      { title: 'Quick Start', slug: 'quick-start', description: 'Render your first editor.' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: '<LixEditor> Props', slug: 'props', description: 'All supported props.' },
      { title: 'Imperative API (ref)', slug: 'imperative-api', description: 'getBlocks, getEditor, replaceBlocks.' },
      { title: 'Block Model', slug: 'block-model', description: 'The shape of a block and built-in types.' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Collaboration', slug: 'collaboration', description: 'Real-time editing with Yjs.' },
      { title: 'Markdown & Slash Commands', slug: 'markdown-shortcuts', description: 'Shortcuts while typing.' },
      { title: 'Rendering Stored Content', slug: 'rendering', description: 'Read-only render of saved blocks.' },
    ],
  },
  {
    title: 'Search Syntax',
    items: [
      { title: 'Search Qualifiers', slug: 'search-syntax', description: 'GitHub-style search on LixBlogs.' },
    ],
  },
];

export const docsNavFlat = docsNav.flatMap((section) => section.items);

export function getDocsSiblings(slug) {
  const flat = docsNavFlat;
  const i = flat.findIndex((item) => item.slug === slug);
  return { prev: flat[i - 1] || null, next: flat[i + 1] || null };
}
