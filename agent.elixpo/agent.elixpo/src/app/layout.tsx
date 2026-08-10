import type { Metadata } from "next";
import { OperationsNav } from "@/components/operations-nav";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, SOCIAL_IMAGE } from "@/lib/site-metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Elixpo", url: "https://github.com/elixpo" }],
  creator: "Elixpo",
  publisher: "Elixpo",
  category: "technology",
  keywords: [
    "OreoFlow",
    "Elixpo",
    "elixpoo",
    "autonomous GitHub agent",
    "GitHub automation",
    "agent operations dashboard",
    "agent orchestration",
    "MLOps",
    "GitOps",
    "developer tools",
    "open source automation",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "1024x1024" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const controlRepo = process.env.ELIXPO_GITHUB_CONTROL_REPO || "elixpo/agent.elixpo";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Elixpo",
        url: "https://elixpo.com",
        logo: `${SITE_URL}/logo.png`,
        sameAs: ["https://github.com/elixpo"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#application`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        image: `${SITE_URL}${SOCIAL_IMAGE.url}`,
        screenshot: `${SITE_URL}${SOCIAL_IMAGE.url}`,
        sourceOrganization: { "@id": `${SITE_URL}/#organization` },
        sameAs: [`https://github.com/${controlRepo}`],
      },
    ],
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <div className="operations-shell"><OperationsNav repositoryUrl={`https://github.com/${controlRepo}`} />{children}</div>
      </body>
    </html>
  );
}
