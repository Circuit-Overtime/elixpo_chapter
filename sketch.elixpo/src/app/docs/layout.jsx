export const metadata = {
  title: 'Docs',
  description:
    'LixSketch documentation — Notion-like block editor with live markdown, code blocks, tables, and inline diagrams.',
  openGraph: {
    title: 'LixSketch Docs',
    description: 'Notion-like editor with live markdown, code blocks, and embedded diagrams.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Docs' }],
  },
  twitter: {
    title: 'LixSketch Docs',
    description: 'Notion-like editor with live markdown and embedded diagrams.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/docs' },
}

export default function DocsLayout({ children }) {
  return children
}
