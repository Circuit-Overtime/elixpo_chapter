import './globals.css';

export const metadata = {
  title: 'Elixpo Art — AI-Powered Creative Platform',
  description:
    'Generate unique and stunning digital art instantly with Elixpo Art. Transform your text prompts into amazing visuals using powerful AI models.',
  keywords:
    'AI art generator, digital art, text to image, creative tools, image generation, Elixpo Art',
  authors: [{ name: 'Elixpo' }],
  metadataBase: new URL('https://elixpo.com'),
  openGraph: {
    type: 'website',
    url: 'https://elixpo.com',
    title: 'Elixpo Art — AI-Powered Creative Platform',
    description:
      'Generate unique and stunning digital art instantly with Elixpo Art. Transform your text prompts into amazing visuals using powerful AI models.',
    siteName: 'Elixpo Art',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elixpo Art — AI-Powered Creative Platform',
    description:
      'Generate unique and stunning digital art instantly with Elixpo Art. Transform your text prompts into amazing visuals using powerful AI models.',
  },
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/bigstar.png?alt=media&token=53c5945b-2b37-4c3e-972c-7bd1b0b9e4f1',
  },
  themeColor: '#0a0f1c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
