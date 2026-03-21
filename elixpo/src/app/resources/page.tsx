export const metadata = {
  title: "Open Source - Elixpo",
  description: "Contributing guides, documentation, and community resources for the Elixpo ecosystem.",
};

const resources = [
  {
    title: "GitHub Repository",
    description: "The main monorepo containing all Elixpo projects. Star us, fork us, or dive into the code.",
    href: "https://github.com/elixpo/elixpo_chapter",
  },
  {
    title: "Contributing Guide",
    description: "Learn how to contribute to Elixpo — from finding issues to submitting your first pull request.",
    href: "https://github.com/elixpo/elixpo_chapter/blob/main/CONTRIBUTING.md",
  },
  {
    title: "Code of Conduct",
    description: "Our community standards. We are committed to providing a welcoming and inclusive experience.",
    href: "https://github.com/elixpo/elixpo_chapter/blob/main/CODE_OF_CONDUCT.md",
  },
  {
    title: "Issue Tracker",
    description: "Find curated issues perfect for new contributors. Look for tags like hacktoberfest-accepted.",
    href: "https://github.com/elixpo/elixpo_chapter/issues",
  },
  {
    title: "Sponsor Elixpo",
    description: "Help us cover infrastructure costs, accelerate development, and expand our open-source initiatives.",
    href: "https://github.com/sponsors/Circuit-Overtime",
  },
  {
    title: "Hacktoberfest",
    description: "We actively participate in Hacktoberfest. Join us in building something amazing every October.",
    href: "https://hacktoberfest.com",
  },
];

export default function ResourcesPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Open Source</h1>
          <p className="text-lg text-muted">
            Elixpo is 100% open source under GNU GPL-3.0. Here is everything you need to get involved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-3xl bg-white border border-border p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2 group-hover:text-accent transition-colors">
                {resource.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{resource.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
