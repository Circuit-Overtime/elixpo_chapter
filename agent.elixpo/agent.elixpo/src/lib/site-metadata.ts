import type { Metadata } from "next";

export const SITE_URL = "https://agent.elixpo.com";
export const SITE_NAME = "OreoFlow";
export const SITE_TITLE = "OreoFlow · Live Agent Operations";
export const SITE_DESCRIPTION =
  "Follow OreoFlow, Elixpo's public autonomous GitHub operations system: live workflow runs, repository work, discussions, security events, and agent activity.";

export const SOCIAL_IMAGE = {
  url: "/default.png",
  width: 1280,
  height: 720,
  type: "image/png",
  alt: "OreoFlow live agent operations dashboard",
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}
