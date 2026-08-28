import { getPersonContent, getPortfolioPersons } from "@/lib/content";
import { getAbsoluteUrl, getMemberImagePath, SITE_URL } from "@/lib/seo";

const SECTION_SLUGS = {
  About: "about",
  Projects: "projects",
  Talks: "talks",
  Publications: "publications",
  Blogs: "blogs",
};

export default function sitemap() {
  const memberPages = getPortfolioPersons().flatMap((person) => {
    const profile = getPersonContent(person, "profile");
    const sections = new Set([
      "connect",
      ...profile.menuItems.map((item) => SECTION_SLUGS[item]).filter(Boolean),
    ]);

    return [
      {
        url: getAbsoluteUrl(`/${person}`),
        changeFrequency: "monthly",
        priority: 0.9,
        images: [getAbsoluteUrl(getMemberImagePath(person))],
      },
      ...Array.from(sections, (section) => ({
        url: getAbsoluteUrl(`/${person}/${section}`),
        changeFrequency: "monthly",
        priority: 0.7,
      })),
    ];
  });

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...memberPages,
  ];
}
