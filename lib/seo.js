import { getPersonContent } from "@/lib/content";

export const SITE_URL = "https://me.elixpo.com";
export const LANDING_TITLE = "Elixpo Members — Portfolios of Builders & Creators";
export const LANDING_DESCRIPTION =
  "Meet Ayushman Bhattacharya, Anwesha Chakraborty, Vivek Yadav, and Karan Ray. Explore the portfolios and projects of the people building Elixpo.";

const SECTION_COPY = {
  about: {
    label: "About",
    description: (name, role) =>
      `Learn about ${name}, ${role} and an Elixpo member, including their background, experience, interests, and work.`,
  },
  projects: {
    label: "Projects",
    description: (name, role) =>
      `Explore projects by ${name}, ${role} and an Elixpo member, with details about their technical and creative work.`,
  },
  publications: {
    label: "Publications",
    description: (name, role) =>
      `Read publications and research by ${name}, ${role} and an Elixpo member.`,
  },
  blogs: {
    label: "Writing",
    description: (name, role) =>
      `Read articles and notes by ${name}, ${role} and an Elixpo member.`,
  },
  talks: {
    label: "Talks",
    description: (name, role) =>
      `Explore talks, sessions, and speaking appearances by ${name}, ${role} and an Elixpo member.`,
  },
  connect: {
    label: "Connect",
    description: (name, role) =>
      `Find verified ways to connect with ${name}, ${role} and an Elixpo member.`,
  },
};

function getMemberDetails(person) {
  const profile = getPersonContent(person, "profile");
  const name = profile.name || profile.siteName;
  const role = profile.siteDescription;

  return { profile, name, role };
}

export function getMemberImagePath(person) {
  return `/assets/${person}/about/landing-card.webp`;
}

export function getAbsoluteUrl(pathname = "/") {
  return new URL(pathname, SITE_URL).toString();
}

export function buildMemberMetadata({ person, section }) {
  const { profile, name, role } = getMemberDetails(person);
  const sectionCopy = section ? SECTION_COPY[section] : null;
  const pathname = section ? `/${person}/${section}` : `/${person}`;
  const image = getMemberImagePath(person);
  const title = sectionCopy
    ? `${sectionCopy.label} — ${profile.siteName}`
    : `${name} — ${role}`;
  const description = sectionCopy
    ? sectionCopy.description(name, role)
    : `Meet ${name}, ${role} and an Elixpo member. Explore their portfolio, projects, publications, writing, and verified profiles.`;
  const imageAlt = `Portrait of ${name}, ${role}`;

  return {
    title,
    description,
    keywords: [
      name,
      profile.siteName,
      role,
      "Elixpo",
      "Elixpo members",
      sectionCopy?.label,
      profile.location,
    ].filter(Boolean),
    authors: [{ name, url: `/${person}` }],
    creator: name,
    publisher: "Elixpo",
    alternates: { canonical: pathname },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "profile",
      url: pathname,
      siteName: "Elixpo Member Portfolios",
      title,
      description,
      images: [{ url: image, width: 384, height: 384, alt: imageAlt }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}

export function buildMemberProfileJsonLd(person) {
  const { profile, name, role } = getMemberDetails(person);
  const profileUrl = getAbsoluteUrl(`/${person}`);
  const imageUrl = getAbsoluteUrl(getMemberImagePath(person));
  const sameAs = profile.socials?.map(({ url }) => url).filter(Boolean) || [];
  let focusTags = [];

  try {
    focusTags = getPersonContent(person, "home").hero?.focusTags || [];
  } catch {
    // Focus tags enrich the profile when present but are not required.
  }

  const personSchema = {
    "@type": "Person",
    "@id": `${profileUrl}#person`,
    name,
    url: profileUrl,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      width: 384,
      height: 384,
    },
    description: role,
    jobTitle: role,
    homeLocation: profile.location
      ? { "@type": "Place", name: profile.location }
      : undefined,
    sameAs,
    knowsAbout: focusTags,
    memberOf: {
      "@type": "Organization",
      name: "Elixpo",
      url: "https://elixpo.com",
    },
  };

  if (profile.siteName && profile.siteName !== name) {
    personSchema.alternateName = profile.siteName;
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profile-page`,
    url: profileUrl,
    name: `${name} — Elixpo member profile`,
    description: `Official Elixpo member profile for ${name}, ${role}.`,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: imageUrl,
      width: 384,
      height: 384,
      caption: `Portrait of ${name}`,
    },
    mainEntity: personSchema,
  };
}

export function buildLandingJsonLd(profiles) {
  const websiteId = `${SITE_URL}/#website`;
  const landingPageId = `${SITE_URL}/#member-portfolios`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${SITE_URL}/`,
        name: "Elixpo",
        alternateName: "Elixpo Member Portfolios",
        description: LANDING_DESCRIPTION,
      },
      {
        "@type": "CollectionPage",
        "@id": landingPageId,
        url: `${SITE_URL}/`,
        name: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        isPartOf: { "@id": websiteId },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: profiles.length,
          itemListElement: profiles.map((profile, index) => {
            const memberUrl = getAbsoluteUrl(`/${profile.slug}`);

            return {
              "@type": "ListItem",
              position: index + 1,
              url: memberUrl,
              item: {
                "@type": "Person",
                "@id": `${memberUrl}#person`,
                name: profile.name || profile.siteName,
                alternateName: profile.siteName,
                url: memberUrl,
                image: getAbsoluteUrl(getMemberImagePath(profile.slug)),
                jobTitle: profile.siteDescription,
                sameAs: profile.socials?.map(({ url }) => url).filter(Boolean) || [],
                memberOf: {
                  "@type": "Organization",
                  name: "Elixpo",
                  url: "https://elixpo.com",
                },
              },
            };
          }),
        },
      },
    ],
  };
}
