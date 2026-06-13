import { Github, GitPullRequest, Scale, CircleDot, Heart, Leaf, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ELIXPO_LINKS } from "@/lib/elixpo-links";
import { VIDEOS } from "@/lib/media";

export const metadata = {
  title: "Open Source",
  description:
    "Contributing guides, documentation, and community resources for the Elixpo ecosystem. Free and open under MIT and CC-BY-4.0.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Open Source | Elixpo",
    description: "Contributing guides and community resources for the Elixpo ecosystem.",
    images: ["/og-image.webp"],
  },
};

const resources = [
  {
    icon: Github,
    title: "GitHub Repository",
    description: "The main monorepo containing all Elixpo projects. Star us, fork us, or dive into the code.",
    href: ELIXPO_LINKS.githubChapter,
  },
  {
    icon: GitPullRequest,
    title: "Contributing Guide",
    description: "Learn how to contribute to Elixpo, from finding issues to submitting your first pull request.",
    href: `${ELIXPO_LINKS.githubChapter}/blob/main/CONTRIBUTING.md`,
  },
  {
    icon: Scale,
    title: "Code of Conduct",
    description: "Our community standards. We are committed to a welcoming and inclusive experience for everyone.",
    href: `${ELIXPO_LINKS.githubChapter}/blob/main/CODE_OF_CONDUCT.md`,
  },
  {
    icon: CircleDot,
    title: "Issue Tracker",
    description: "Find curated issues perfect for new contributors. Look for tags like hacktoberfest-accepted.",
    href: `${ELIXPO_LINKS.githubChapter}/issues`,
  },
  {
    icon: Heart,
    title: "Sponsor Elixpo",
    description: "Help us cover infrastructure costs, accelerate development, and expand our open-source initiatives.",
    href: ELIXPO_LINKS.sponsors,
  },
  {
    icon: Leaf,
    title: "Hacktoberfest",
    description: "We actively participate in Hacktoberfest. Join us in building something amazing every October.",
    href: "https://hacktoberfest.com",
  },
];

export default function ResourcesPage() {
  return (
    <div className="bg-black text-[#E1E0CC] select-none">
      <PageHero
        eyebrow="Get Involved"
        title="Open Source"
        subtitle="Elixpo is 100% open source under MIT and CC-BY-4.0. Here is everything you need to get involved."
        video={VIDEOS.url}
      />

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-2xl bg-[#141414] border border-white/10 p-7 overflow-hidden hover:border-primary/30 transition-colors duration-300 noise-overlay"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between mb-5">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/15 transition-colors">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <ArrowUpRight size={16} className="text-white/30 group-hover:text-primary transition-colors" />
                </div>

                <h3 className="relative z-10 text-lg font-medium text-white mb-2 group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                <p className="relative z-10 text-sm text-[#DEDBC8]/70 leading-relaxed">
                  {resource.description}
                </p>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
