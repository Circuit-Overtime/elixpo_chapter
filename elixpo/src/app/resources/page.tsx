import Link from "next/link";

export const metadata = {
  title: "Resources - Elixpo",
  description: "Guides, documentation, and resources to help you get the most out of Elixpo.",
};

const resources = [
  {
    title: "Documentation",
    description: "Comprehensive guides to help you set up and use every feature.",
    href: "/docs",
    icon: "book",
  },
  {
    title: "API Reference",
    description: "Complete API documentation for building custom integrations.",
    href: "/api",
    icon: "code",
  },
  {
    title: "Community",
    description: "Join our community of builders and share your experiences.",
    href: "/community",
    icon: "users",
  },
  {
    title: "Blog",
    description: "Latest updates, tutorials, and insights from the Elixpo team.",
    href: "/blog",
    icon: "pen",
  },
];

export default function ResourcesPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Resources</h1>
          <p className="text-lg text-muted">
            Everything you need to get started and make the most of Elixpo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((resource) => (
            <Link
              key={resource.title}
              href={resource.href}
              className="group rounded-3xl bg-white border border-border p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2 group-hover:text-accent transition-colors">
                {resource.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{resource.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
