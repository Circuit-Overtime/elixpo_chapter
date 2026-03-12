export const metadata = {
  title: 'Blog',
  description:
    'Updates, deep dives, and behind-the-scenes on building LixSketch — an open-source infinite canvas and diagram tool.',
  openGraph: {
    title: 'LixSketch Blog',
    description: 'Engineering deep dives, design decisions, and updates from the LixSketch team.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Blog' }],
  },
  twitter: {
    title: 'LixSketch Blog',
    description: 'Engineering deep dives and updates from the LixSketch team.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/resources/blog' },
}

export default function BlogLayout({ children }) {
  return children
}
