export const runtime = 'edge'

export const metadata = {
  title: 'Canvas Embed',
  description: 'LixSketch canvas embed — for use inside another product via iframe.',
  robots: { index: false, follow: false },
}

export default function EmbedCanvasLayout({ children }) {
  return children
}
