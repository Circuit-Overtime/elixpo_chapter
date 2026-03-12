export const metadata = {
  title: 'Pricing',
  description:
    'LixSketch is free and open source. Team and enterprise plans coming soon for advanced collaboration features.',
  openGraph: {
    title: 'LixSketch Pricing',
    description: 'Free and open source. Team plans coming soon.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch Pricing' }],
  },
  twitter: {
    title: 'LixSketch Pricing',
    description: 'Free and open source forever. Team plans coming soon.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/pricing' },
}

export default function PricingLayout({ children }) {
  return children
}
