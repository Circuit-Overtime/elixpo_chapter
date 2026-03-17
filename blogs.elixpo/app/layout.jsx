import './globals.css';
import '../src/App.css';
import '../src/styles/homepage/header.css';
import '../src/styles/homepage/innerLayout.css';
import '../src/styles/homepage/innerLayoutPseudo.css';
import '../src/styles/homepage/responsive.css';

export const metadata = {
  title: 'Blogs | Elixpo',
  description: 'A place to read, write and enjoy the creative aspect',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
