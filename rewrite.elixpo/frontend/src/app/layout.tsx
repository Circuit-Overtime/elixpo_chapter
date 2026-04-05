import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ReWrite — AI Detection & Paraphrasing",
  description: "Detect and rewrite AI-generated content in academic papers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased min-h-screen">
        <nav className="border-b border-border-light">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold font-[family-name:var(--font-display)] text-gradient">
              ReWrite
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/" className="text-text-muted hover:text-text-primary transition-colors">Home</a>
              <a href="/session" className="text-text-muted hover:text-text-primary transition-colors">History</a>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
