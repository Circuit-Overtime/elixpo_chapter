import { getMemberSeo, getPersonContent } from "@/lib/content";

export const SITE_URL = "https://me.elixpo.com";
export const LANDING_TITLE = "Elixpo Members — Portfolios of Builders & Creators";
export const LANDING_DESCRIPTION =
  "Meet Ayushman Bhattacharya, Anwesha Chakraborty, Vivek Yadav, and Karan Ray. Explore the portfolios and projects of the people building Elixpo.";

const SECTION_COPY = {
  about: {
    label: "About",
    title: (name) => `About ${name}`,
    description: (name, seo) =>
      `Learn about ${name}, ${seo.jobTitle}, including their background, experience, technical interests and work with Elixpo.`,
  },
  projects: {
    label: "Projects",
    title: (name) => `Projects by ${name}`,
    description: (name, seo) =>
      `Explore projects by ${name} across ${seo.knowsAbout.slice(0, 4).join(", ")}, with details about their work and contributions.`,
  },
  publications: {
    label: "Publications",
    title: (name) => `Publications by ${name}`,
    description: (name, seo) =>
      `Read publications and research by ${name}, ${seo.jobTitle} and an Elixpo member.`,
  },
  blogs: {
    label: "Writing",
    title: (name) => `Writing by ${name}`,
    description: (name, seo) =>
      `Read articles and technical notes by ${name} about ${seo.knowsAbout.slice(0, 4).join(", ")}.`,
  },
  talks: {
    label: "Talks",
    title: (name) => `Talks by ${name}`,
    description: (name, seo) =>
      `Explore talks, sessions and speaking appearances by ${name}, ${seo.jobTitle} and an Elixpo member.`,
  },
  connect: {
    label: "Connect",
    title: (name) => `Connect with ${name}`,
    description: (name, seo) =>
      `Find verified social profiles and ways to connect with ${name}, ${seo.jobTitle} and an Elixpo member.`,
  },
};

function getMemberDetails(person) {
  const profile = getPersonContent(person, "profile");
  const name = profile.name || profile.siteName;
  const role = profile.siteDescription;
  const configuredSeo = getMemberSeo(person);
  const nameParts = name.trim().split(/\s+/);
  const seo = {
    ...configuredSeo,
    givenName: configuredSeo.givenName || nameParts[0],
    familyName: configuredSeo.familyName || nameParts.slice(1).join(" ") || undefined,
    jobTitle: configuredSeo.jobTitle || role,
    aliases: configuredSeo.aliases?.length
      ? configuredSeo.aliases
      : [profile.siteName].filter(Boolean),
    keywords: configuredSeo.keywords || [],
    knowsAbout: configuredSeo.knowsAbout?.length
      ? configuredSeo.knowsAbout
      : [role],
    affiliations: configuredSeo.affiliations || ["Elixpo"],
  };

  return { profile, seo, name, role };
}

export function getMemberImagePath(person) {
  return `/assets/${person}/about/landing-card.webp`;
}

export function getAbsoluteUrl(pathname = "/") {
  return new URL(pathname, SITE_URL).toString();
}

export function buildMemberMetadata({ person, section }) {
  const { profile, seo, name, role } = getMemberDetails(person);
  const sectionCopy = section ? SECTION_COPY[section] : null;
  const pathname = section ? `/${person}/${section}` : `/${person}`;
  const image = getMemberImagePath(person);
  const title = sectionCopy
    ? `${sectionCopy.title(name)} | Elixpo`
    : seo.title || `${name} — ${role} | Elixpo`;
  const description = sectionCopy
    ? sectionCopy.description(name, seo)
    : seo.description || `Meet ${name}, ${role} and an Elixpo member. Explore their portfolio, projects and verified profiles.`;
  const imageAlt = `Portrait of ${name}, ${role}`;

  return {
    title: { absolute: title },
    description,
    keywords: Array.from(
      new Set([
        name,
        profile.siteName,
        role,
        ...seo.keywords,
        "Elixpo",
        "Elixpo members",
        sectionCopy?.label,
        profile.location,
      ].filter(Boolean)),
    ),
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
      type: section ? "website" : "profile",
      url: pathname,
      siteName: "Elixpo Member Portfolios",
      title,
      description,
      ...(!section && {
        firstName: seo.givenName,
        lastName: seo.familyName,
        username: person,
      }),
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
  const { profile, seo, name, role } = getMemberDetails(person);
  const profileUrl = getAbsoluteUrl(`/${person}`);
  const imageUrl = getAbsoluteUrl(getMemberImagePath(person));
  const sameAs = profile.socials?.map(({ url }) => url).filter(Boolean) || [];
  let focusTags = seo.knowsAbout;

  try {
    if (focusTags.length === 0) {
      focusTags = getPersonContent(person, "home").hero?.focusTags || [];
    }
  } catch {
    // Focus tags enrich the profile when present but are not required.
  }

  const personSchema = {
    "@type": "Person",
    "@id": `${profileUrl}#person`,
    name,
    givenName: seo.givenName,
    familyName: seo.familyName,
    alternateName: seo.aliases?.length ? seo.aliases : profile.siteName,
    identifier: person,
    url: profileUrl,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      width: 384,
      height: 384,
    },
    description: seo.description || role,
    jobTitle: seo.jobTitle || role,
    homeLocation: profile.location
      ? { "@type": "Place", name: profile.location }
      : undefined,
    sameAs,
    knowsAbout: focusTags,
    affiliation: seo.affiliations.map((affiliation) => ({
      "@type": "Organization",
      name: affiliation,
    })),
    memberOf: {
      "@type": "Organization",
      name: "Elixpo",
      url: "https://elixpo.com",
    },
  };

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profile-page`,
    url: profileUrl,
    name: `${name} — Elixpo member profile`,
    description: seo.description || `Official Elixpo member profile for ${name}, ${role}.`,
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
            const { seo, name } = getMemberDetails(profile.slug);

            return {
              "@type": "ListItem",
              position: index + 1,
              url: memberUrl,
              item: {
                "@type": "Person",
                "@id": `${memberUrl}#person`,
                name,
                givenName: seo.givenName,
                familyName: seo.familyName,
                alternateName: seo.aliases,
                url: memberUrl,
                image: getAbsoluteUrl(getMemberImagePath(profile.slug)),
                description: seo.description,
                jobTitle: seo.jobTitle,
                knowsAbout: seo.knowsAbout,
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
