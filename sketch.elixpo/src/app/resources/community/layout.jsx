export const metadata = {
  title: 'Community',
  description:
    'LixSketch is fully open source — contribute on GitHub, report bugs, request features, and help build the future of diagramming.',
  openGraph: {
    title: 'LixSketch Community',
    description:
      'Join the open-source community — star, fork, contribute, and shape the future of LixSketch.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Community' }],
  },
  twitter: {
    title: 'LixSketch Community',
    description: 'Open source diagramming — contribute, star, and build together.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/resources/community' },
}

export default function CommunityLayout({ children }) {
  return children
}
