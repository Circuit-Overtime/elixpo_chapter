export const metadata = {
  title: 'Roadmap',
  description:
    'What LixSketch has shipped, what we\'re building now, and where we\'re headed — canvas engine, collaboration, LixScript, and more.',
  openGraph: {
    title: 'LixSketch Roadmap',
    description:
      'Shipped features, in-progress work, and future plans — follow the journey of an open-source diagram tool.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Roadmap' }],
  },
  twitter: {
    title: 'LixSketch Roadmap',
    description: 'What we\'ve shipped, what we\'re building, and where we\'re headed.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/roadmap' },
}

export default function RoadmapLayout({ children }) {
  return children
}
