export const metadata = {
  title: 'VS Code Extension',
  description:
    'LixSketch for VS Code — draw diagrams inside your editor. Full canvas tab, LixScript syntax highlighting, and live preview.',
  openGraph: {
    title: 'LixSketch for VS Code',
    description:
      'Draw diagrams inside VS Code. Full canvas tab, .lix syntax highlighting, and live preview.',
    images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: 'LixSketch VS Code Extension' }],
  },
  twitter: {
    title: 'LixSketch for VS Code',
    description: 'Full infinite canvas as a VS Code editor tab.',
    images: ['/Images/og-image.png'],
  },
  alternates: { canonical: '/resources/vscode-extension' },
}

export default function VscodeExtensionLayout({ children }) {
  return children
}
