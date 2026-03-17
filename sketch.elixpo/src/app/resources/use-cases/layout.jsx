export const metadata = {
  title: 'Use Cases',
  description:
    'Architecture diagrams, wireframes, brainstorming, documentation, flowcharts — see how teams use LixSketch.',
  openGraph: {
    title: 'LixSketch Use Cases',
    description:
      'Architecture diagrams, wireframes, brainstorming, documentation — discover what you can build.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Use Cases' }],
  },
  twitter: {
    title: 'LixSketch Use Cases',
    description: 'Architecture diagrams, wireframes, brainstorming, and more.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/resources/use-cases' },
}

export default function UseCasesLayout({ children }) {
  return children
}
