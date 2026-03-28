import './globals.css';
import { AuthProvider } from '../src/context/AuthContext';

export const metadata = {
  title: 'LixBlogs',
  description: 'A place to read, write, and enjoy the creative aspect',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kanit:wght@500;600;700&family=Source+Serif+4:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0c1017] text-[#e8edf5] antialiased" style={{ fontFamily: "'lixFont', sans-serif" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js" defer />
        <script noModule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js" defer />
      </body>
    </html>
  );
}
