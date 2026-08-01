export const metadata = {
  title: 'Teams & Collaboration',
  description:
    'Real-time collaboration on LixSketch — WebSocket rooms, live cursors, Durable Objects, and zero-setup sharing.',
  openGraph: {
    title: 'LixSketch Teams & Collaboration',
    description:
      'Share a link, draw together in real time. WebSocket rooms, live cursors, zero setup.',
    images: [{ url: '/og-image.png', width: 1280, height: 720, alt: 'LixSketch Collaboration' }],
  },
  twitter: {
    title: 'LixSketch Teams & Collaboration',
    description: 'Real-time collaboration with live cursors and WebSocket rooms.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/teams' },
}

export default function TeamsLayout({ children }) {
  return children
}
