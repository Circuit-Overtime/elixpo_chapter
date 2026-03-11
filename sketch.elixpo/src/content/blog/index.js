/**
 * Blog post registry.
 * Each entry maps a slug to metadata. The actual content is loaded
 * from .md files via raw imports at build time.
 */

export const blogPosts = [
  {
    slug: 'e2e-encryption',
    title: 'How LixSketch Ensures End-to-End Encryption',
    description: 'A deep dive into our E2E encryption architecture — how your canvas data stays private even from our servers.',
    icon: 'bx bx-shield-quarter',
    date: '2026-02-15',
    tags: ['security', 'architecture'],
  },
  {
    slug: 'websocket-collaboration',
    title: 'Real-Time Collaboration with Durable Objects',
    description: 'How we use Cloudflare Durable Objects and WebSockets for zero-conflict real-time editing.',
    icon: 'bx bx-broadcast',
    date: '2026-02-28',
    tags: ['collaboration', 'infrastructure'],
  },
  {
    slug: 'lixscript-dsl',
    title: 'Designing LixScript: A DSL for Diagrams',
    description: 'Why we built a custom declarative language for diagram generation and how the parser works.',
    icon: 'bx bx-code-curly',
    date: '2026-03-05',
    tags: ['lixscript', 'language-design'],
  },
  {
    slug: 'roughjs-canvas',
    title: 'Why We Chose RoughJS for the Canvas',
    description: 'The design philosophy behind hand-drawn aesthetics and why SVG beats HTML5 Canvas for diagramming.',
    icon: 'bx bx-pen',
    date: '2026-03-10',
    tags: ['design', 'rendering'],
  },
]

export function getBlogPost(slug) {
  return blogPosts.find(p => p.slug === slug) || null
}
