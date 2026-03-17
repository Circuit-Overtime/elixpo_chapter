import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: {
    default: "Elixpo",
    template: "%s | Elixpo",
  },
  description: "Personalized portfolio showcase for Elixpo organization members",
  icons: {
    icon: "https://cdn.discordapp.com/app-icons/1214916249222643752/f60abd68fff5f65f72076a5aaac5afb8.png?size=512",
  },
  openGraph: {
    type: "website",
    siteName: "Elixpo",
    title: "Elixpo",
    description: "Personalized portfolio showcase for Elixpo organization members",
    images: [{ url: "/assets/og-image.png", width: 1200, height: 630, alt: "Elixpo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elixpo",
    description: "Personalized portfolio showcase for Elixpo organization members",
    images: ["/assets/og-image.png"],
  },
  metadataBase: new URL("https://me.elixpo.com"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bitcount+Grid+Double:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.css"
        />
        <script
          type="module"
          src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
        />
        <script
          noModule
          src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
