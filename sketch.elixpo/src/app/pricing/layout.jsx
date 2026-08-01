export const metadata = {
  title: 'Pricing',
  description:
    'LixSketch is free and open source. Team and enterprise plans coming soon for advanced collaboration features.',
  openGraph: {
    title: 'LixSketch Pricing',
    description: 'Free and open source. Team plans coming soon.',
    images: [{ url: '/og-image.png', width: 1280, height: 720, alt: 'LixSketch Pricing' }],
  },
  twitter: {
    title: 'LixSketch Pricing',
    description: 'Free and open source forever. Team plans coming soon.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/pricing' },
}

export default function PricingLayout({ children }) {
  return children
}
