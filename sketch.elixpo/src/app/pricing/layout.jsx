export const metadata = {
  title: 'Pricing in India | LixSketch',
  description:
    'Compare LixSketch Free, Pro, and Team plans in Indian rupees. Start free with canvas, docs, encrypted sync, collaboration, and exports.',
  keywords: [
    'LixSketch pricing',
    'online whiteboard pricing India',
    'diagram tool pricing',
    'collaborative canvas India',
  ],
  openGraph: {
    title: 'LixSketch Pricing — Free, Pro, and Team',
    description: 'Simple India-first pricing for visual thinking, from ₹0.',
    type: 'website',
    url: '/pricing',
    images: [{ url: '/og-image.png', width: 1280, height: 720, alt: 'LixSketch pricing plans' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LixSketch Pricing — Free, Pro, and Team',
    description: 'Simple India-first pricing for visual thinking, from ₹0.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/pricing' },
}

export default function PricingLayout({ children }) {
  return children
}
